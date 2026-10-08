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
import { FLAG_C } from '../../../src/core/z80/flags.ts'
import { makeTestCpu, runOne } from './test-cpu.ts'

describe('DD/FD-prefixed (IX/IY) opcodes', () => {
  it('LD IX,nn / INC IX', () => {
    const { cpu, bus } = makeTestCpu()
    runOne(cpu, bus, [0xdd, 0x21, 0x00, 0x90]) // LD IX,0x9000
    expect(cpu.r.ix.w).toBe(0x9000)
    runOne(cpu, bus, [0xdd, 0x23], 4) // INC IX
    expect(cpu.r.ix.w).toBe(0x9001)
  })

  it('LD (IX+n),B / LD A,(IX+n) address relative to IX with a signed offset', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.ix.w = 0x9000
    cpu.r.bc.h = 0x42
    runOne(cpu, bus, [0xdd, 0x70, 0x05]) // LD (IX+5),B
    expect(bus.readByte(0x9005)).toBe(0x42)

    bus.writeByte(0x8ffe, 0x7a)
    runOne(cpu, bus, [0xdd, 0x7e, 0xfe], 3) // LD A,(IX-2) from a later PC
    expect(cpu.r.a).toBe(0x7a)
  })

  it('IY variant addresses independently from IX', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.ix.w = 0x1000
    cpu.r.iy.w = 0x2000
    runOne(cpu, bus, [0xfd, 0x36, 0x00, 0x99]) // LD (IY+0),0x99
    expect(bus.readByte(0x2000)).toBe(0x99)
    expect(bus.readByte(0x1000)).toBe(0) // IX-relative memory untouched
  })

  it('ADD A,IXH / ADD A,IXL operate on the undocumented half-registers', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.ix.w = 0x1234
    cpu.r.a = 0x01
    runOne(cpu, bus, [0xdd, 0x84]) // ADD A,IXH
    expect(cpu.r.a).toBe(0x13)
  })

  it('DD CB d op (BIT/RES/SET/shift on (IX+d)) addresses the indexed byte', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.ix.w = 0x9000
    bus.writeByte(0x9003, 0x01)
    runOne(cpu, bus, [0xdd, 0xcb, 0x03, 0x1e]) // RR (IX+3)
    expect(bus.readByte(0x9003)).toBe(0x00)
    expect(cpu.r.f & FLAG_C).toBeTruthy() // the bit that was shifted out
  })

  it('DD CB rotate also writes back into the named register (undocumented)', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.ix.w = 0x9000
    bus.writeByte(0x9000, 0x01)
    runOne(cpu, bus, [0xdd, 0xcb, 0x00, 0x00]) // RLC (IX+0),B (undocumented copy into B)
    expect(bus.readByte(0x9000)).toBe(0x02)
    expect(cpu.r.bc.h).toBe(0x02)
  })

  it('unhandled DD-prefixed opcodes fall through to the base table', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.a = 0x01
    const cycles = runOne(cpu, bus, [0xdd, 0x3c]) // DD-prefixed INC A: not overridden by DD, falls to base
    expect(cpu.r.a).toBe(0x02)
    expect(cycles).toBe(8) // 4 (wasted DD prefix) + 4 (INC A)
  })
})
