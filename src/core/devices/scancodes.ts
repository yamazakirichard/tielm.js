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

/**
 * TI-85 keypad scancode table, ported from tilem/emu/x5/x5_subcore.c's
 * `keynames[64]` array (index i = scancode i+1) and cross-checked against
 * the named constants in tilem/emu/scancodes.h where they exist. `KEY_ON`
 * (0x29) lives in keypad.ts since it's handled specially there.
 */
import { KEY_ON } from './keypad.ts'

export interface KeyDef {
  scancode: number
  label: string
}

/** Internal keyboard scan-matrix order (8 rows x 8 columns), matching keynames[64] -- NOT the calculator's visual/physical button layout (see src/ui/components/keyboardLayout.ts for that). 0 = unused matrix position. */
export const KEY_LAYOUT: (KeyDef | null)[][] = [
  [key('Down', 1), key('Left', 2), key('Right', 3), key('Up', 4), null, null, null, null],
  [key('Enter', 9), key('+', 10), key('-', 11), key('*', 12), key('/', 13), key('^', 14), key('Clear', 15), null],
  [key('(-)', 17), key('3', 18), key('6', 19), key('9', 20), key(')', 21), key('tan', 22), key('Custom', 23), null],
  [key('.', 25), key('2', 26), key('5', 27), key('8', 28), key('(', 29), key('cos', 30), key('Prgm', 31), key('Del', 32)],
  [key('0', 33), key('1', 34), key('4', 35), key('7', 36), key('EE', 37), key('sin', 38), key('Stat', 39), key('x-VAR', 40)],
  [key('On', KEY_ON), key('Sto→', 42), key(',', 43), key('x²', 44), key('LN', 45), key('LOG', 46), key('Graph', 47), key('Alpha', 48)],
  [key('F5', 49), key('F4', 50), key('F3', 51), key('F2', 52), key('F1', 53), key('2nd', 54), key('Exit', 55), key('More', 56)],
  [null, null, null, null, null, null, null, null],
]

/** Flat lookup, scancode (1-64, plus KEY_ON) -> label, built from KEY_LAYOUT. */
export const SCANCODE_LABELS: ReadonlyMap<number, string> = new Map(
  KEY_LAYOUT.flat()
    .filter((k): k is KeyDef => k !== null)
    .map((k) => [k.scancode, k.label]),
)

function key(label: string, scancode: number): KeyDef {
  return { scancode, label }
}
