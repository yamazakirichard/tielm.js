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
import {
  FLAG_C,
  FLAG_H,
  FLAG_N,
  FLAG_S,
  FLAG_V,
  FLAG_Z,
  add8,
  daa,
  dec8,
  inc8,
  parity8,
  sub8,
} from '../../../src/core/z80/flags.ts'

describe('parity8', () => {
  it('sets FLAG_P for even parity', () => {
    expect(parity8(0x00)).toBeTruthy() // 0 bits set: even
    expect(parity8(0x03)).toBeTruthy() // 2 bits set: even
  })

  it('clears FLAG_P for odd parity', () => {
    expect(parity8(0x01)).toBe(0)
    expect(parity8(0x07)).toBe(0)
  })
})

describe('add8', () => {
  it('sets half-carry on a low-nibble carry', () => {
    const { result, flags } = add8(0x0f, 0x01)
    expect(result).toBe(0x10)
    expect(flags & FLAG_H).toBeTruthy()
    expect(flags & FLAG_C).toBe(0)
  })

  it('sets carry and zero on wraparound', () => {
    const { result, flags } = add8(0xff, 0x01)
    expect(result).toBe(0x00)
    expect(flags & FLAG_Z).toBeTruthy()
    expect(flags & FLAG_C).toBeTruthy()
  })
})

describe('sub8', () => {
  it('sets carry (borrow) and half-carry on 0 - 1', () => {
    const { result, flags } = sub8(0x00, 0x01)
    expect(result).toBe(0xff)
    expect(flags & FLAG_C).toBeTruthy()
    expect(flags & FLAG_H).toBeTruthy()
    expect(flags & FLAG_S).toBeTruthy()
    expect(flags & FLAG_N).toBeTruthy()
  })
})

describe('inc8/dec8', () => {
  it('inc8 0x7f -> 0x80 sets S, H and overflow (V), not Z', () => {
    const { result, flags } = inc8(0x7f, 0)
    expect(result).toBe(0x80)
    expect(flags & FLAG_S).toBeTruthy()
    expect(flags & FLAG_H).toBeTruthy()
    expect(flags & FLAG_V).toBeTruthy()
    expect(flags & FLAG_Z).toBe(0)
  })

  it('inc8 0xff -> 0x00 sets Z and H, not overflow', () => {
    const { result, flags } = inc8(0xff, 0)
    expect(result).toBe(0x00)
    expect(flags & FLAG_Z).toBeTruthy()
    expect(flags & FLAG_H).toBeTruthy()
    expect(flags & FLAG_V).toBe(0)
  })

  it('inc8/dec8 preserve the incoming carry flag', () => {
    expect(inc8(0x01, FLAG_C).flags & FLAG_C).toBeTruthy()
    expect(dec8(0x01, FLAG_C).flags & FLAG_C).toBeTruthy()
  })

  it('dec8 0x80 -> 0x7f sets overflow (V) and N', () => {
    const { result, flags } = dec8(0x80, 0)
    expect(result).toBe(0x7f)
    expect(flags & FLAG_V).toBeTruthy()
    expect(flags & FLAG_N).toBeTruthy()
  })
})

describe('daa', () => {
  it('corrects 0x09 + 0x09 (BCD 9+9) to 0x18 with no carry', () => {
    const added = add8(0x09, 0x09)
    expect(added.result).toBe(0x12)
    const corrected = daa(added.result, added.flags)
    expect(corrected.result).toBe(0x18)
    expect(corrected.flags & FLAG_C).toBe(0)
  })

  it('corrects 0x99 + 0x01 (BCD 99+1) to 0x00 with carry set', () => {
    const added = add8(0x99, 0x01)
    const corrected = daa(added.result, added.flags)
    expect(corrected.result).toBe(0x00)
    expect(corrected.flags & FLAG_C).toBeTruthy()
    expect(corrected.flags & FLAG_Z).toBeTruthy()
  })
})
