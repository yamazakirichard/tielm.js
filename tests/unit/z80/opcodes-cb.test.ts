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
import { FLAG_C, FLAG_Z } from '../../../src/core/z80/flags.ts'
import { makeTestCpu, runOne } from './test-cpu.ts'

describe('CB-prefixed opcodes', () => {
  it('RLC B rotates left through carry-out, carry-in from the vacated bit', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.bc.h = 0x80
    runOne(cpu, bus, [0xcb, 0x00]) // RLC B
    expect(cpu.r.bc.h).toBe(0x01)
    expect(cpu.r.f & FLAG_C).toBeTruthy()
  })

  it('SRL (HL) shifts memory right, cycle cost 15', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.hl.w = 0x9000
    bus.writeByte(0x9000, 0x03)
    const cycles = runOne(cpu, bus, [0xcb, 0x3e]) // SRL (HL)
    expect(bus.readByte(0x9000)).toBe(0x01)
    expect(cpu.r.f & FLAG_C).toBeTruthy()
    expect(cycles).toBe(15)
  })

  it('BIT 7,A sets Z when the bit is clear', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.a = 0x7f
    runOne(cpu, bus, [0xcb, 0x7f]) // BIT 7,A
    expect(cpu.r.f & FLAG_Z).toBeTruthy()
  })

  it('RES 0,C clears bit 0 without touching other bits', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.bc.l = 0xff
    runOne(cpu, bus, [0xcb, 0x81]) // RES 0,C
    expect(cpu.r.bc.l).toBe(0xfe)
  })

  it('SET 3,(HL) sets bit 3 in memory', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.hl.w = 0x9000
    bus.writeByte(0x9000, 0x00)
    runOne(cpu, bus, [0xcb, 0xde]) // SET 3,(HL)
    expect(bus.readByte(0x9000)).toBe(0x08)
  })
})
