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
import { KEY_ON } from '../../../src/core/devices/keypad.ts'
import { KEY_LAYOUT, SCANCODE_LABELS } from '../../../src/core/devices/scancodes.ts'

describe('scancodes', () => {
  it('places KEY_ON at scancode 0x29, matching tilem/emu/scancodes.h', () => {
    expect(KEY_ON).toBe(0x29)
    expect(SCANCODE_LABELS.get(KEY_ON)).toBe('On')
  })

  it('every scancode in the layout is unique and within 1-64 (or KEY_ON)', () => {
    const seen = new Set<number>()
    for (const row of KEY_LAYOUT) {
      for (const k of row) {
        if (k === null) continue
        expect(seen.has(k.scancode)).toBe(false)
        seen.add(k.scancode)
        expect(k.scancode === KEY_ON || (k.scancode >= 1 && k.scancode <= 64)).toBe(true)
      }
    }
  })

  it('maps a couple of well-known keys to their expected scancodes', () => {
    expect(SCANCODE_LABELS.get(9)).toBe('Enter')
    expect(SCANCODE_LABELS.get(1)).toBe('Down')
    expect(SCANCODE_LABELS.get(54)).toBe('2nd')
  })
})
