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
import { Ti85Calc } from '../../../src/core/calc/ti85.ts'
import { ROM_SIZE } from '../../../src/core/memory/ti85-bus.ts'

/**
 * Standing regression guard against an accidentally-introduced hotspot in
 * the dispatch loop or timer scheduler (plan's testing strategy item 6).
 * Uses a synthetic busy-loop program rather than the user's ROM, which is
 * gitignored and may not be present on every machine running the suite.
 */
describe('perf smoke test', () => {
  it('simulates 1 second of TI-85 time (6,000,000 cycles) within a generous wall-clock budget', () => {
    const calc = new Ti85Calc()
    const rom = new Uint8Array(ROM_SIZE)
    // A tight, never-ending loop: DJNZ back to itself (reloads B via the
    // preceding LD B,n each time it wraps to 0), so the CPU never halts and
    // keeps dispatching instructions for the whole measured run.
    rom.set([0x06, 0x00, 0x10, 0xfe], 0) // LD B,0 ; DJNZ $-2
    calc.loadRom(rom)

    const start = performance.now()
    calc.runForCycles(6_000_000)
    const elapsedMs = performance.now() - start

    // Generous budget: a naive switch-dispatch interpreter should comfortably
    // clear real-time (1000ms) for 1 sim-second; this just guards against a
    // gross regression (e.g. an accidental O(n^2)), not tight performance.
    expect(elapsedMs).toBeLessThan(5000)
  })
})
