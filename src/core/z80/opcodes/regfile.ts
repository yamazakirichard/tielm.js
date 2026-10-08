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

import type { Z80Registers } from '../registers.ts'

/**
 * Maps the 3-bit register field used throughout the CB/ED tables (and the
 * base table's LD r,r'/ALU r blocks) to a register: 0=B,1=C,2=D,3=E,4=H,5=L,
 * 6=(HL) [callers must special-case 6 themselves; memory access needs a bus],
 * 7=A.
 */
export function getReg8(r: Z80Registers, idx: number): number {
  switch (idx) {
    case 0:
      return r.bc.h
    case 1:
      return r.bc.l
    case 2:
      return r.de.h
    case 3:
      return r.de.l
    case 4:
      return r.hl.h
    case 5:
      return r.hl.l
    case 7:
      return r.a
    default:
      throw new Error(`getReg8: index ${idx} is not a plain register (6 = (HL), handled by the caller)`)
  }
}

export function setReg8(r: Z80Registers, idx: number, value: number): void {
  const v = value & 0xff
  switch (idx) {
    case 0:
      r.bc.h = v
      break
    case 1:
      r.bc.l = v
      break
    case 2:
      r.de.h = v
      break
    case 3:
      r.de.l = v
      break
    case 4:
      r.hl.h = v
      break
    case 5:
      r.hl.l = v
      break
    case 7:
      r.a = v
      break
    default:
      throw new Error(`setReg8: index ${idx} is not a plain register (6 = (HL), handled by the caller)`)
  }
}
