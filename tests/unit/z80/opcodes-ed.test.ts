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

import { describe, expect, it } from 'vitest'
import { FLAG_Z } from '../../../src/core/z80/flags.ts'
import { makeTestCpu, runOne } from './test-cpu.ts'

describe('ED-prefixed opcodes', () => {
  it('NEG negates A and sets carry unless A was 0', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.a = 0x01
    runOne(cpu, bus, [0xed, 0x44]) // NEG
    expect(cpu.r.a).toBe(0xff)
  })

  it('LDIR copies a block and decrements BC to 0 (re-executing itself each step until done)', () => {
    const { cpu, bus } = makeTestCpu()
    bus.loadBytes(0x1000, [1, 2, 3])
    bus.loadBytes(0, [0xed, 0xb0]) // LDIR, self-repeating while BC != 0
    cpu.r.pc.w = 0
    cpu.r.hl.w = 0x1000
    cpu.r.de.w = 0x2000
    cpu.r.bc.w = 3
    for (let i = 0; i < 3 && cpu.r.bc.w > 0; i++) cpu.step()
    expect(bus.readByte(0x2000)).toBe(1)
    expect(bus.readByte(0x2001)).toBe(2)
    expect(bus.readByte(0x2002)).toBe(3)
    expect(cpu.r.bc.w).toBe(0)
    expect(cpu.r.hl.w).toBe(0x1003)
    expect(cpu.r.de.w).toBe(0x2003)
    expect(cpu.r.pc.w).toBe(2) // fell through to the instruction after LDIR on the final iteration
  })

  it('CPIR finds a matching byte and stops early', () => {
    const { cpu, bus } = makeTestCpu()
    bus.loadBytes(0x1000, [1, 2, 3, 4])
    bus.loadBytes(0, [0xed, 0xb1]) // CPIR, self-repeating while BC != 0 and no match
    cpu.r.pc.w = 0
    cpu.r.hl.w = 0x1000
    cpu.r.bc.w = 4
    cpu.r.a = 3
    for (let i = 0; i < 4 && !(cpu.r.f & FLAG_Z); i++) cpu.step()
    expect(cpu.r.f & FLAG_Z).toBeTruthy()
    expect(cpu.r.hl.w).toBe(0x1003) // stopped right after the matching byte at 0x1002
    expect(cpu.r.bc.w).toBe(1)
  })

  it('ADC HL,BC / SBC HL,BC round-trip', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.hl.w = 0x1000
    cpu.r.bc.w = 0x0100
    runOne(cpu, bus, [0xed, 0x4a]) // ADC HL,BC
    expect(cpu.r.hl.w).toBe(0x1100)
    runOne(cpu, bus, [0xed, 0x42], 2) // SBC HL,BC
    expect(cpu.r.hl.w).toBe(0x1000)
  })

  it('IN r,(C) / OUT (C),r go through the port bus using BC as the port', () => {
    const { cpu, bus, ports } = makeTestCpu()
    cpu.r.bc.w = 0x1234
    cpu.r.de.h = 0x77
    runOne(cpu, bus, [0xed, 0x51]) // OUT (C),D
    expect(ports.lastOut).toEqual({ port: 0x1234, value: 0x77 })

    ports.inputValue = 0x99
    runOne(cpu, bus, [0xed, 0x50], 2) // IN D,(C)
    expect(cpu.r.de.h).toBe(0x99)
  })

  it('RLD rotates a BCD nibble from memory into A', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.hl.w = 0x9000
    cpu.r.a = 0x12
    bus.writeByte(0x9000, 0x34)
    runOne(cpu, bus, [0xed, 0x6f]) // RLD
    expect(cpu.r.a).toBe(0x13)
    expect(bus.readByte(0x9000)).toBe(0x42)
  })

  it('LD A,I copies IFF2 into the parity flag', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.ir.h = 0x55
    cpu.r.iff2 = 1
    runOne(cpu, bus, [0xed, 0x57]) // LD A,I
    expect(cpu.r.a).toBe(0x55)
  })

  it('undefined ED opcodes behave as an 8-cycle NOP', () => {
    const { cpu, bus } = makeTestCpu()
    const cycles = runOne(cpu, bus, [0xed, 0x00]) // not a defined ED opcode
    expect(cycles).toBe(8)
  })
})
