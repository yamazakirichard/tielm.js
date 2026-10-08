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
import { KEY_LAYOUT } from '../../../src/core/devices/scancodes.ts'
import { VISUAL_KEYPAD_LAYOUT } from '../../../src/ui/components/keyboardLayout.ts'

function scancodesInVisualLayout(): number[] {
  const codes: number[] = []
  for (const row of VISUAL_KEYPAD_LAYOUT) {
    if (row.type === 'row') {
      for (const k of row.keys) {
        if (k !== null) codes.push(k.scancode)
      }
    } else {
      for (const r of row.left) {
        for (const k of r) {
          if (k !== null) codes.push(k.scancode)
        }
      }
      codes.push(row.diamond.up.scancode, row.diamond.left.scancode, row.diamond.right.scancode, row.diamond.down.scancode)
    }
  }
  return codes
}

function scancodesInMatrixLayout(): number[] {
  const codes: number[] = []
  for (const row of KEY_LAYOUT) {
    for (const k of row) {
      if (k !== null) codes.push(k.scancode)
    }
  }
  return codes
}

describe('keyboardLayout', () => {
  it('every scancode appears exactly once', () => {
    const codes = scancodesInVisualLayout()
    const seen = new Set<number>()
    for (const c of codes) {
      expect(seen.has(c)).toBe(false)
      seen.add(c)
    }
  })

  it('covers exactly the same set of scancodes as the scan-matrix layout', () => {
    const visual = new Set(scancodesInVisualLayout())
    const matrix = new Set(scancodesInMatrixLayout())
    expect(visual).toEqual(matrix)
  })
})
