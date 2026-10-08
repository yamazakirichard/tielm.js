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
import { DEFAULT_OFF_COLOR, DEFAULT_ON_COLOR, unpackFrame } from '../../../src/ui/lcd-render.ts'

describe('unpackFrame', () => {
  it('maps a set bit to the "on" color and a clear bit to the "off" color, MSB-first', () => {
    const bits = new Uint8Array(2) // 2x1 frame, 1 byte/row -> width=8, height=2
    bits[0] = 0b10000000 // row 0: leftmost pixel on
    bits[1] = 0b00000001 // row 1: rightmost pixel on
    const rgba = unpackFrame(bits, 8, 2)

    expect([...rgba.slice(0, 4)]).toEqual([...DEFAULT_ON_COLOR])
    expect([...rgba.slice(4, 8)]).toEqual([...DEFAULT_OFF_COLOR])
    // row 1, pixel 7 (rightmost): byte offset = 1*8*4 + 7*4
    expect([...rgba.slice(1 * 32 + 28, 1 * 32 + 32)]).toEqual([...DEFAULT_ON_COLOR])
  })

  it('produces exactly width*height*4 bytes', () => {
    const bits = new Uint8Array(16 * 64)
    const rgba = unpackFrame(bits, 128, 64)
    expect(rgba.length).toBe(128 * 64 * 4)
  })

  it('accepts custom colors', () => {
    const bits = new Uint8Array([0xff])
    const rgba = unpackFrame(bits, 8, 1, [1, 2, 3, 255], [4, 5, 6, 255])
    expect([...rgba.slice(0, 4)]).toEqual([1, 2, 3, 255])
  })
})
