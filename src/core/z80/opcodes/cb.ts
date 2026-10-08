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
 * CB-prefixed (rotate/shift/BIT/RES/SET) Z80 opcode table, ported from
 * tilem/emu/z80cb.h. When `indexedAddr` is given (reached via DD CB d op /
 * FD CB d op from opcodes/ddfd.ts), every operation reads/writes that memory
 * address instead of (HL) or a plain register, and non-BIT operations also
 * write the result back into the register named by the low 3 bits of `op`
 * (an undocumented but well-known quirk) unless that field is 6.
 */
import type { Z80 } from '../cpu.ts'
import { FLAG_C, FLAG_H, FLAG_S, FLAG_SXY, FLAG_ZP, rl, rlc, rr, rrc, sla, slia, sra, srl } from '../flags.ts'
import { getReg8, setReg8 } from './regfile.ts'

type ShiftFn = (value: number, oldFlags: number) => { result: number; flags: number }

const SHIFT_OPS: ShiftFn[] = [
  (v) => rlc(v),
  (v) => rrc(v),
  (v, f) => rl(v, f),
  (v, f) => rr(v, f),
  (v) => sla(v),
  (v) => sra(v),
  (v) => slia(v),
  (v) => srl(v),
]

const FLAG_XY = 0x28 // FLAG_X | FLAG_Y

/** BIT b,(addr) undocumented X/Y flags come from the high byte of the address (WZ/W), not from the result. */
function bitFlags(bitValue: number, xySource: number, oldFlags: number): number {
  return (bitValue & FLAG_S) | (xySource & FLAG_XY) | (bitValue ? 0 : FLAG_ZP) | FLAG_H | (oldFlags & FLAG_C)
}

export function executeCb(cpu: Z80, op: number, indexedAddr?: number): void {
  const r = cpu.r
  const group = op >> 6 // 0=shift, 1=BIT, 2=RES, 3=SET
  const bit = (op >> 3) & 0x07
  const regIdx = op & 0x07

  if (indexedAddr !== undefined) {
    if (group === 1) {
      const value = cpu.readByte(indexedAddr) & (1 << bit)
      r.f = bitFlags(value, (indexedAddr >> 8) & 0xff, r.f)
      cpu.delay(16)
      return
    }
    const value = cpu.readByte(indexedAddr)
    let result: number
    if (group === 0) {
      const res = SHIFT_OPS[bit](value, r.f)
      result = res.result
      r.f = res.flags
    } else if (group === 2) {
      result = value & ~(1 << bit)
    } else {
      result = value | (1 << bit)
    }
    cpu.writeByte(indexedAddr, result)
    if (regIdx !== 6) setReg8(r, regIdx, result)
    cpu.delay(19)
    return
  }

  if (regIdx === 6) {
    const value = cpu.readByte(r.hl.w)
    if (group === 1) {
      const bitVal = value & (1 << bit)
      r.f = bitFlags(bitVal, r.wz.h, r.f)
      cpu.delay(12)
      return
    }
    let result: number
    if (group === 0) {
      const res = SHIFT_OPS[bit](value, r.f)
      result = res.result
      r.f = res.flags
    } else if (group === 2) {
      result = value & ~(1 << bit)
    } else {
      result = value | (1 << bit)
    }
    cpu.writeByte(r.hl.w, result)
    cpu.delay(15)
    return
  }

  const value = getReg8(r, regIdx)
  if (group === 1) {
    const bitVal = value & (1 << bit)
    r.f = (bitVal & FLAG_SXY) | (bitVal ? 0 : FLAG_ZP) | FLAG_H | (r.f & FLAG_C)
    cpu.delay(8)
    return
  }
  let result: number
  if (group === 0) {
    const res = SHIFT_OPS[bit](value, r.f)
    result = res.result
    r.f = res.flags
  } else if (group === 2) {
    result = value & ~(1 << bit)
  } else {
    result = value | (1 << bit)
  }
  setReg8(r, regIdx, result)
  cpu.delay(8)
}
