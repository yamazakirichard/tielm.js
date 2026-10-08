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

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runComProgram } from './harness.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

function loadVendorBytes(name: string): Uint8Array {
  const buf = readFileSync(path.join(here, 'vendor', name))
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

/**
 * zexall/zexdoc are exhaustive CRC-based exercisers: each of their ~60+ test
 * categories runs an instruction across a huge number of register/flag
 * combinations, which legitimately takes hundreds of millions of emulated
 * Z80 instructions per category on a simple switch-dispatch interpreter like
 * this one (confirmed by tracing -- this is normal zexall behavior, not a
 * hang). A full run can take tens of minutes, so the automated test here
 * runs a bounded number of steps (enough to clear several categories in
 * well under a minute) and asserts no ERROR line appeared in whatever
 * categories it got through. For a full, unbounded run (e.g. to validate
 * new opcode work), run this file manually with a much larger step budget.
 */
const STEP_BUDGET = 1_000_000_000

describe('zexdoc (documented Z80 instruction/flag behavior)', () => {
  it('reports no ERROR lines in the categories it completes within the step budget', () => {
    const bytes = loadVendorBytes('zexdoc.com')
    const result = runComProgram(bytes, STEP_BUDGET)
    console.log(`zexdoc: ${result.steps} instructions, ${result.cycles} cycles, completed=${!result.timedOut}`)
    console.log(result.output)
    expect(result.output).not.toMatch(/ERROR/)
  }, 120_000)
})
