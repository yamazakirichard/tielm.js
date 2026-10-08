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
import { Z80Registers } from '../../../src/core/z80/registers.ts'

describe('Z80Registers', () => {
  it('combines h/l into a 16-bit word', () => {
    const r = new Z80Registers()
    r.hl.w = 0x1234
    expect(r.hl.h).toBe(0x12)
    expect(r.hl.l).toBe(0x34)
  })

  it('wraps 16-bit writes to 0xffff', () => {
    const r = new Z80Registers()
    r.bc.w = 0x1ffff
    expect(r.bc.w).toBe(0xffff)
  })

  it('exposes a/f as af.h/af.l aliases', () => {
    const r = new Z80Registers()
    r.a = 0x42
    r.f = 0x99
    expect(r.af.w).toBe(0x4299)
  })

  it('increments only the low 7 bits of R, preserving bit 7', () => {
    const r = new Z80Registers()
    r.r = 0xff
    expect(r.ir.l).toBe(0x7f)
    expect(r.r7).toBe(0x80)
    r.incR()
    // 0x7f + 1 wraps to 0 within the low 7 bits
    expect(r.r).toBe(0x80)
  })
})
