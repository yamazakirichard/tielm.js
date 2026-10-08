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

import { describe, expect, it, vi } from 'vitest'
import { pressWithMinHold, releaseWithMinHold } from '../../../src/ui/keyHold.ts'

function fakeCalc() {
  return { pressKey: vi.fn(), releaseKey: vi.fn() }
}

describe('keyHold', () => {
  it('presses immediately', () => {
    const calc = fakeCalc()
    pressWithMinHold(calc as never, 9)
    expect(calc.pressKey).toHaveBeenCalledWith(9)
  })

  it('delays release until the minimum hold has elapsed', () => {
    vi.useFakeTimers()
    const calc = fakeCalc()
    pressWithMinHold(calc as never, 9)
    releaseWithMinHold(calc as never, 9)
    expect(calc.releaseKey).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(calc.releaseKey).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(calc.releaseKey).toHaveBeenCalledWith(9)
    vi.useRealTimers()
  })

  it('releases immediately if already held past the minimum', () => {
    vi.useFakeTimers()
    const calc = fakeCalc()
    pressWithMinHold(calc as never, 9)
    vi.advanceTimersByTime(600)
    releaseWithMinHold(calc as never, 9)
    expect(calc.releaseKey).toHaveBeenCalledWith(9)
    vi.useRealTimers()
  })

  it('ignores a release with no matching press', () => {
    const calc = fakeCalc()
    releaseWithMinHold(calc as never, 42)
    expect(calc.releaseKey).not.toHaveBeenCalled()
  })

  it('ignores a second press of an already-held key', () => {
    const calc = fakeCalc()
    pressWithMinHold(calc as never, 9)
    pressWithMinHold(calc as never, 9)
    expect(calc.pressKey).toHaveBeenCalledTimes(1)
  })
})
