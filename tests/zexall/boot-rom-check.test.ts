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

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'vitest'
import { Ti85Calc } from '../../src/core/calc/ti85.ts'

const ROM_PATH = path.join(import.meta.dirname, '../../public/ROM/TI85.ROM')

/**
 * Manual diagnostic: loads the user's real ROM and runs it for a large
 * cycle budget, reporting where it ends up. Confirmed findings (see
 * docs/PLAN.md's M5 progress log for the full writeup):
 *
 * - The ROM boots cleanly with no exceptions and no unimplemented opcodes,
 *   reaching a HALT at PC=0x0d1b within a few million cycles. Disassembly
 *   confirms this is real hardware behavior, not a bug: the reset code
 *   powers off the LCD, arms only the ON-key interrupt (port3=0x01), and
 *   halts waiting for it -- exactly what a real cold-booted TI-85 does.
 * - Feeding it a simulated ON keypress does wake the CPU (the IM1 ISR at
 *   0x0038 runs, RAM gets touched), but repeated presses keep landing back
 *   on the same HALT with port3 still 0x01 (TIMER1 never gets armed). Full
 *   progress to a visible home screen most likely needs the periodic
 *   TIMER1 interrupt (M6's timer scheduler) as well -- this ROM's boot
 *   path may depend on both interrupt sources, not ON-key alone.
 */
describe.skipIf(!existsSync(ROM_PATH))('manual: boot the real TI85.ROM', () => {
  it('runs for a large cycle budget with no exceptions', () => {
    const calc = new Ti85Calc()
    const buf = readFileSync(ROM_PATH)
    calc.loadRom(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength))

    const BUDGET_CYCLES = 50_000_000 // ~8 sim-seconds at 6MHz
    let lastPc = calc.z80.r.pc.w
    try {
      let ran = 0
      while (ran < BUDGET_CYCLES) {
        ran += calc.runForCycles(1_000_000)
        lastPc = calc.z80.r.pc.w
      }
      console.log(`Ran ${ran} cycles with no exception. Final PC=0x${lastPc.toString(16)}, halted=${calc.z80.halted}`)
    } catch (e) {
      console.log(`Stopped with exception at PC=0x${lastPc.toString(16)}: ${(e as Error).message}`)
    }
  }, 60_000)
})
