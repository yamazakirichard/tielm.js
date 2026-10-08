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

/**
 * Minimal headless CP/M host for running zexall.com/zexdoc.com against the
 * Z80 core. Real CP/M isn't emulated -- just enough of the BDOS console
 * functions (C_WRITE=2, C_WRITESTR=9) that these programs use to print
 * their results, plus the warm-boot re-entry point (address 0x0000) that
 * they jump to when finished.
 *
 * BDOS calls are intercepted by checking PC before each step rather than by
 * trapping an opcode at address 0x0005: whenever PC lands on 0x0005 (where
 * a real CP/M's BDOS entry point would be), the requested function runs
 * directly against host memory/output and a RET is simulated, without
 * involving the Z80 core at all.
 */
import type { PortIO } from '../../src/core/z80/cpu.ts'
import { Z80 } from '../../src/core/z80/cpu.ts'
import { FlatMemoryBus } from '../../src/core/memory/bus.ts'

class NullPorts implements PortIO {
  input(): number {
    return 0xff
  }
  output(): void {}
}

export interface RunResult {
  output: string
  steps: number
  cycles: number
  timedOut: boolean
}

/** Loads a CP/M .com image at 0x0100 and runs it until it warm-boots (jumps to 0x0000). */
export function runComProgram(comBytes: Uint8Array, maxSteps = 500_000_000): RunResult {
  const bus = new FlatMemoryBus()
  const cpu = new Z80(bus, new NullPorts())
  bus.loadBytes(0x100, comBytes)
  cpu.r.pc.w = 0x100
  cpu.r.sp.w = 0xfffe

  let output = ''
  let steps = 0

  while (cpu.r.pc.w !== 0x0000) {
    if (steps >= maxSteps) {
      return { output, steps, cycles: cpu.clock, timedOut: true }
    }

    if (cpu.r.pc.w === 0x0005) {
      const fn = cpu.r.bc.l
      if (fn === 2) {
        output += String.fromCharCode(cpu.r.de.l & 0xff)
      } else if (fn === 9) {
        let addr = cpu.r.de.w
        let b = bus.readByte(addr)
        while (b !== 0x24 /* '$' */) {
          output += String.fromCharCode(b)
          addr = (addr + 1) & 0xffff
          b = bus.readByte(addr)
        }
      }
      cpu.r.pc.w = cpu.pop()
      continue
    }

    cpu.step()
    steps++
  }

  return { output, steps, cycles: cpu.clock, timedOut: false }
}
