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

import type { Ti85Calc } from '../core/calc/ti85.ts'

/**
 * The real ROM's keyboard-scan debounce turns out to need a key held for
 * roughly 400-700ms of simulated time to register reliably (confirmed by
 * scanning hold durations against the actual ROM: <350ms and >750ms both
 * consistently failed to produce any visible change, while the window in
 * between consistently worked, for multiple different keys). A natural
 * human click is usually shorter than that. Rather than ask users to
 * awkwardly hold every key, every press is stretched to at least this long
 * regardless of how quickly the pointer/keyboard event releases it.
 */
export const MIN_HOLD_MS = 550

const pressedAt = new Map<number, number>()

export function pressWithMinHold(calc: Ti85Calc, scancode: number): void {
  if (pressedAt.has(scancode)) return
  pressedAt.set(scancode, Date.now())
  calc.pressKey(scancode)
}

export function releaseWithMinHold(calc: Ti85Calc, scancode: number): void {
  const start = pressedAt.get(scancode)
  if (start === undefined) return
  pressedAt.delete(scancode)
  const remaining = MIN_HOLD_MS - (Date.now() - start)
  if (remaining > 0) {
    setTimeout(() => calc.releaseKey(scancode), remaining)
  } else {
    calc.releaseKey(scancode)
  }
}
