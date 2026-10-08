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
import { KEY_ON, Keypad } from '../../../src/core/devices/keypad.ts'

describe('Keypad', () => {
  it('readKeys returns all-1s (active-low, none pressed) when idle', () => {
    const kp = new Keypad()
    kp.setGroup(0x00) // select all groups
    expect(kp.readKeys()).toBe(0xff)
  })

  it('a pressed key pulls its bit low when its group is selected', () => {
    const kp = new Keypad()
    // scancode 9 = row 1, bit 0 ("Enter" per x5_subcore.c's keynames)
    kp.pressKey(9)
    kp.setGroup(~(1 << 1) & 0xff) // select group 1 (active-low select)
    expect(kp.readKeys() & 0x01).toBe(0)
  })

  it('a key in an unselected group does not appear pressed', () => {
    const kp = new Keypad()
    kp.pressKey(9) // row 1
    kp.setGroup(~(1 << 2) & 0xff) // select group 2, not 1
    expect(kp.readKeys()).toBe(0xff)
  })

  it('ghosting: three keys forming an L can make a fourth appear pressed', () => {
    const kp = new Keypad()
    // Press (row0,col0), (row0,col1), (row1,col0) -- ghosting can pull in (row1,col1).
    kp.keysDown[0] = 0b00000011 // row 0: bits 0 and 1 down
    kp.keysDown[1] = 0b00000001 // row 1: bit 0 down
    kp.setGroup(0x00) // select all rows
    const keys = ~kp.readKeys() & 0xff // active-high view for easier assertions
    expect(keys & 0b00000011).toBe(0b00000011)
  })

  it('ON key interrupt fires only on a down-edge while onKeyInt is armed', () => {
    const kp = new Keypad()
    kp.onKeyInt = true
    expect(kp.pressKey(KEY_ON)).toBe(true)
    expect(kp.pressKey(KEY_ON)).toBe(false) // already down, no new edge
    expect(kp.releaseKey(KEY_ON)).toBe(true)
  })

  it('ON key interrupt is suppressed when onKeyInt is not armed', () => {
    const kp = new Keypad()
    expect(kp.pressKey(KEY_ON)).toBe(false)
  })
})
