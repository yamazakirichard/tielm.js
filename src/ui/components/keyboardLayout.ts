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
 * TI-85's *physical* keypad layout -- distinct from src/core/devices/
 * scancodes.ts's KEY_LAYOUT, which is the internal electrical scan-matrix
 * order. Positions/grouping here were derived from tilem's actual TI-85
 * skin file (data/skins/ti85.skn: 50 real key bounding-box rects) cross-
 * referenced against gui/event.c's keycode_map[] (fixed rect-index ->
 * scancode table shared by all VTI/TiEmu-format skins) and emu/scancodes.h.
 * Secondary (2nd, orange) and alpha (blue) legends were transcribed from a
 * photo of a real TI-85 keypad, cross-checked against the standard
 * published TI-85 key legend.
 */
import { KEY_ON } from '../../core/devices/keypad.ts'

export interface VisualKey {
  scancode: number
  /** Orange "2nd"-shifted legend printed above/on the key, if any. */
  secondary?: string
  /** Blue "ALPHA"-shifted legend printed on the key, if any. */
  alpha?: string
}

/** null = blank spacer slot (keeps column alignment consistent with 5-wide rows). */
export type VisualSlot = VisualKey | null

/** A plain 5-wide row of the main keypad grid. */
export interface StandardRow {
  type: 'row'
  /** Marks the F1-F5 row, styled smaller/grayer and set apart, directly under the screen. */
  variant?: 'function'
  keys: VisualSlot[]
}

/**
 * The 2nd/Exit/More + Alpha/x-VAR/Del block, together with the arrow-key
 * diamond that sits to its right on real hardware. Its own row type
 * because the shape genuinely isn't a single row of slots: two 3-key rows
 * on the left plus a diamond of 4 keys on the right.
 */
export interface NavRow {
  type: 'nav'
  /** [ [2nd, Exit, More], [Alpha, x-VAR, Del] ] */
  left: [VisualSlot[], VisualSlot[]]
  diamond: { up: VisualKey; left: VisualKey; right: VisualKey; down: VisualKey }
}

export type VisualRow = StandardRow | NavRow

function k(scancode: number, secondary?: string, alpha?: string): VisualKey {
  return { scancode, secondary, alpha }
}

export const VISUAL_KEYPAD_LAYOUT: VisualRow[] = [
  {
    type: 'row',
    variant: 'function',
    keys: [k(53, 'M1'), k(52, 'M2'), k(51, 'M3'), k(50, 'M4'), k(49, 'M5')], // F1 F2 F3 F4 F5
  },
  {
    type: 'nav',
    left: [
      [k(54), k(55, 'QUIT'), k(56, 'MODE')], // 2nd Exit More
      [k(48), k(40, 'LINK'), k(32, 'INS')], // Alpha x-VAR Del
    ],
    diamond: { up: k(4), left: k(2), right: k(3), down: k(1) },
  },
  {
    type: 'row',
    keys: [k(47, 'SOLVER'), k(39, 'SIMULT'), k(31, 'POLY'), k(23, 'CATALOG'), k(15, 'TOLER')], // Graph Stat Prgm Custom Clear
  },
  {
    type: 'row',
    keys: [k(46, '10ˣ'), k(38, 'SIN⁻¹'), k(30, 'COS⁻¹'), k(22, 'TAN⁻¹'), k(14, 'DT', 'E')], // LOG sin cos tan ^
  },
  {
    type: 'row',
    keys: [k(45, 'eˣ', 'F'), k(37, 'x⁻¹', 'G'), k(29, undefined, 'H'), k(21, undefined, 'I'), k(13, 'CALC', 'J')], // LN EE ( ) /
  },
  {
    type: 'row',
    keys: [k(44, undefined, 'K'), k(36, 'MATRX', 'L'), k(28, 'VECTR', 'M'), k(20, 'CPLX', 'N'), k(12, 'MATH', 'O')], // x² 7 8 9 *
  },
  {
    type: 'row',
    keys: [k(43, '∠', 'P'), k(35, 'CONS', 'Q'), k(27, 'CONV', 'R'), k(19, 'STRNG', 'S'), k(11, 'LIST', 'T')], // , 4 5 6 -
  },
  {
    type: 'row',
    keys: [k(42, undefined, 'RCL'), k(34, 'BASE', 'U'), k(26, 'TEST', 'V'), k(18, 'VARS', 'W'), k(10, 'MEM', 'X')], // Sto→ 1 2 3 +
  },
  {
    type: 'row',
    keys: [k(KEY_ON, 'OFF'), k(33, 'CHAR', 'Y'), k(25, undefined, 'Z'), k(17, 'ANS'), k(9, 'ENTRY')], // On 0 . (-) Enter
  },
]
