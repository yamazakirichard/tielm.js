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

import { useEffect } from 'react'
import type { Ti85Calc } from '../../core/calc/ti85.ts'
import { KEY_ON } from '../../core/devices/keypad.ts'
import { pressWithMinHold, releaseWithMinHold } from '../keyHold.ts'

/**
 * Best-effort physical-keyboard -> TI-85 scancode mapping. Not exhaustive
 * (there's no reasonable 1:1 mapping for every TI-85 key on a PC keyboard),
 * but covers navigation, digits, basic arithmetic, and the keys needed to
 * actually drive the calculator (ON, 2nd, Alpha, Enter, Clear/Del, F1-F5).
 */
const KEY_MAP: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowLeft: 2,
  ArrowRight: 3,
  ArrowUp: 4,
  Enter: 9,
  '+': 10,
  '-': 11,
  '*': 12,
  '/': 13,
  '^': 14,
  Delete: 15, // Clear
  '3': 18,
  '6': 19,
  '9': 20,
  ')': 21,
  '.': 25,
  '2': 26,
  '5': 27,
  '8': 28,
  '(': 29,
  '0': 33,
  '1': 34,
  '4': 35,
  '7': 36,
  Escape: KEY_ON,
  ',': 43,
  Backspace: 32, // Del
  Alt: 48, // Alpha
  F1: 53,
  F2: 52,
  F3: 51,
  F4: 50,
  F5: 49,
  Tab: 54, // 2nd
}

/** Attaches window keydown/keyup listeners mapping physical keys to calc.pressKey/releaseKey, while `enabled`. */
export function useKeyboardInput(calc: Ti85Calc, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    const pressed = new Set<string>()

    const handleKeyDown = (e: KeyboardEvent) => {
      const scancode = KEY_MAP[e.key]
      if (scancode === undefined) return
      e.preventDefault()
      if (!pressed.has(e.key)) {
        pressed.add(e.key)
        pressWithMinHold(calc, scancode)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const scancode = KEY_MAP[e.key]
      if (scancode === undefined) return
      e.preventDefault()
      pressed.delete(e.key)
      releaseWithMinHold(calc, scancode)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      for (const key of pressed) {
        const scancode = KEY_MAP[key]
        if (scancode !== undefined) releaseWithMinHold(calc, scancode)
      }
    }
  }, [calc, enabled])
}
