/*
 * Tielm.js - a browser-based TI-85 emulator
 * Copyright (C) 2026 the Tielm.js contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { Bus } from '../memory/bus.ts'
import { RegPair, Z80Registers } from './registers.ts'
import { executeBase } from './opcodes/base.ts'
import { executeCb } from './opcodes/cb.ts'
import { executeDdFd } from './opcodes/ddfd.ts'
import { executeEd } from './opcodes/ed.ts'

/** Port I/O side of the bus, wired to PortBus/devices at the TI-85 hardware layer (M4). */
export interface PortIO {
  input(port: number): number
  output(port: number, value: number): void
}

/**
 * Z80 CPU core. Ported from tilem/emu/z80.c's z80_execute/z80_execute_opcode.
 * `step()` fetches and executes exactly one instruction (or, while halted,
 * one HALT-equivalent tick) and returns the number of clock cycles it took.
 *
 * Interrupt handling here is a reasonable simplification of tilem's model:
 * `requestInterrupt()` sets an edge-triggered request (consumed on
 * acceptance; a device wanting a sustained line should call it again each
 * time it wants another interrupt accepted, once real hardware devices are
 * wired up at M6). The one-instruction interrupt suppression after EI only
 * accounts for *unprefixed* EI (0xFB) -- EI reached via an unhandled DD/FD
 * fallthrough (vanishingly rare in real programs, and not exercised by
 * zexall) isn't specially tracked. The HALT fast-forward-to-next-timer
 * optimization from tilem is deferred until the timer/device scheduler
 * exists (M6/M7); for now HALT just ticks 4 cycles per step() call.
 */
export class Z80 {
  r = new Z80Registers()
  bus: Bus
  ports: PortIO
  /** Cumulative cycle count since reset (mirrors TilemZ80.clock). */
  clock = 0
  halted = false

  /** Edge-triggered maskable interrupt request, consumed on acceptance. */
  interruptLine = false
  /** Data bus value used by IM 0/2 servicing (real hardware: essentially random). */
  interruptDataBus = 0xff

  constructor(bus: Bus, ports: PortIO) {
    this.bus = bus
    this.ports = ports
  }

  reset(): void {
    this.r = new Z80Registers()
    this.r.sp.w = 0xffff
    this.clock = 0
    this.halted = false
    this.interruptLine = false
  }

  requestInterrupt(dataBusValue = 0xff): void {
    this.interruptLine = true
    this.interruptDataBus = dataBusValue & 0xff
  }

  /** Executes one instruction (or interrupt-acceptance sequence) and returns the cycles it consumed. */
  step(): number {
    const startClock = this.clock

    if (this.halted) {
      if (this.interruptLine && this.r.iff1) {
        // tilem's loop always does `PC++` on the phantom fetch *before*
        // deciding whether to accept an interrupt; PC only gets decremented
        // back to point at the HALT opcode in the *other* branch (still
        // waiting, no interrupt this cycle). So the return address pushed
        // here must be PC+1 (the instruction after HALT) -- pushing PC
        // itself (still pointing at the HALT opcode, from the last time we
        // *didn't* wake) would make RETI land right back on HALT forever.
        this.halted = false
        this.r.pc.w = (this.r.pc.w + 1) & 0xffff
        this.acceptInterrupt()
      } else {
        // Real hardware (and tilem's HALT fast-forward, `Rl += t1/4`) keeps
        // internally fetching a phantom NOP once per 4 cycles while halted,
        // incrementing R each time. Software sometimes reads R as a crude
        // elapsed-time counter (it advances predictably even with no timer
        // callback registered), so this needs to keep ticking during HALT too.
        this.r.incR()
        this.delay(4)
      }
      return this.clock - startClock
    }

    const op = this.fetchOpcodeM1()
    const isEI = op === 0xfb
    this.executeOpcode(op)

    if (this.halted) {
      // Matches tilem's `PC--` on HALT: back up so the next fetch re-reads 0x76.
      this.r.pc.w = (this.r.pc.w - 1) & 0xffff
    } else if (this.interruptLine && this.r.iff1 && !isEI) {
      this.acceptInterrupt()
    }

    return this.clock - startClock
  }

  private acceptInterrupt(): void {
    this.r.iff1 = 0
    this.r.iff2 = 0
    this.r.incR()
    this.interruptLine = false

    switch (this.r.im) {
      case 0:
        this.delay(2)
        this.executeOpcode(this.interruptDataBus)
        break
      case 2: {
        this.push(this.r.pc.w)
        const vecAddr = ((this.r.ir.h << 8) | this.interruptDataBus) & 0xffff
        this.r.pc.w = this.readWord(vecAddr)
        this.delay(19)
        break
      }
      case 1:
      default:
        this.push(this.r.pc.w)
        this.r.pc.w = 0x0038
        this.delay(13)
        break
    }
  }

  private fetchOpcodeM1(): number {
    const op = this.bus.readByte(this.r.pc.w)
    this.r.pc.w = (this.r.pc.w + 1) & 0xffff
    this.r.incR()
    return op
  }

  private executeOpcode(op: number): void {
    switch (op) {
      case 0xcb: {
        const subOp = this.fetchOpcodeM1()
        executeCb(this, subOp)
        break
      }
      case 0xed: {
        const subOp = this.fetchOpcodeM1()
        executeEd(this, subOp)
        break
      }
      case 0xdd: {
        const subOp = this.fetchOpcodeM1()
        this.delay(4)
        executeDdFd(this, subOp, false)
        break
      }
      case 0xfd: {
        const subOp = this.fetchOpcodeM1()
        this.delay(4)
        executeDdFd(this, subOp, true)
        break
      }
      default:
        executeBase(this, op)
    }
  }

  delay(cycles: number): void {
    this.clock += cycles
  }

  readByte(addr: number): number {
    return this.bus.readByte(addr & 0xffff)
  }

  /** Reads the byte at PC and advances PC by one (the readb(PC++) pattern). */
  fetchByte(): number {
    const b = this.readByte(this.r.pc.w)
    this.r.pc.w = (this.r.pc.w + 1) & 0xffff
    return b
  }

  /** Reads the word at PC and advances PC by two (the readw(PC); PC+=2 pattern). */
  fetchWord(): number {
    const w = this.readWord(this.r.pc.w)
    this.r.pc.w = (this.r.pc.w + 2) & 0xffff
    return w
  }

  writeByte(addr: number, value: number): void {
    this.bus.writeByte(addr & 0xffff, value & 0xff)
  }

  /** Little-endian 16-bit read (tilem's z80_readw: low byte at addr, high byte at addr+1). */
  readWord(addr: number): number {
    const lo = this.bus.readByte(addr & 0xffff)
    const hi = this.bus.readByte((addr + 1) & 0xffff)
    return lo | (hi << 8)
  }

  writeWord(addr: number, value: number): void {
    this.bus.writeByte(addr & 0xffff, value & 0xff)
    this.bus.writeByte((addr + 1) & 0xffff, (value >> 8) & 0xff)
  }

  push(value: number): void {
    this.r.sp.w = (this.r.sp.w - 2) & 0xffff
    this.writeWord(this.r.sp.w, value)
  }

  pop(): number {
    const value = this.readWord(this.r.sp.w)
    this.r.sp.w = (this.r.sp.w + 2) & 0xffff
    return value
  }

  input(port: number): number {
    return this.ports.input(port & 0xffff)
  }

  output(port: number, value: number): void {
    this.ports.output(port & 0xffff, value & 0xff)
  }
}

/** EX macro equivalent: swaps the 16-bit values of two register pairs. */
export function swapWords(a: RegPair, b: RegPair): void {
  const tmp = a.w
  a.w = b.w
  b.w = tmp
}
