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
 * Z80 flag bits and pure ALU flag-computation helpers.
 * Ported from tilem/emu/z80.h (bit constants) and tilem/emu/z80cmds.h (flag macros).
 * Each `computeX` function takes plain operand(s) (and, where the macro reads F,
 * the incoming flags byte) and returns `{ result, flags }` rather than mutating
 * global register state, so callers in opcodes/*.ts can apply it to any register.
 */

export const FLAG_S = 0x80
export const FLAG_Z = 0x40
export const FLAG_Y = 0x20
export const FLAG_H = 0x10
export const FLAG_X = 0x08
export const FLAG_P = 0x04
export const FLAG_V = FLAG_P
export const FLAG_N = 0x02
export const FLAG_C = 0x01

export const FLAG_ZP = FLAG_Z | FLAG_P

const FLAG_XY = FLAG_X | FLAG_Y
const FLAG_XYC = FLAG_X | FLAG_Y | FLAG_C
export const FLAG_SXY = FLAG_S | FLAG_X | FLAG_Y
const FLAG_SXYC = FLAG_S | FLAG_X | FLAG_Y | FLAG_C

export interface Result8 {
  result: number
  flags: number
}

export interface Result16 {
  result: number
  flags: number
}

/** Parity flag value (FLAG_P or 0) for an 8-bit value, matching z80cmds.h's parity_table. */
export function parity8(v: number): number {
  let x = v & 0xff
  x ^= x >> 4
  x ^= x >> 2
  x ^= x >> 1
  return x & 1 ? 0 : FLAG_P
}

export function add8(a: number, b: number): Result8 {
  const arg1 = a & 0xff
  const arg2 = b & 0xff
  const res = arg1 + arg2
  const resb = res & 0xff
  const flags =
    (res & FLAG_SXY) |
    (resb ? 0 : FLAG_Z) |
    ((arg1 ^ arg2 ^ res) & FLAG_H) |
    (((arg1 ^ ~arg2) & (arg1 ^ res) & 0x80) >> 5) |
    (res >> 8)
  return { result: resb, flags }
}

export function adc8(a: number, b: number, carryIn: number): Result8 {
  const arg1 = a & 0xff
  const arg2 = b & 0xff
  const res = arg1 + arg2 + (carryIn & 1)
  const resb = res & 0xff
  const flags =
    (res & FLAG_SXY) |
    (resb ? 0 : FLAG_Z) |
    ((arg1 ^ arg2 ^ res) & FLAG_H) |
    (((arg1 ^ ~arg2) & (arg1 ^ res) & 0x80) >> 5) |
    (res >> 8)
  return { result: resb, flags }
}

export function sub8(a: number, b: number): Result8 {
  const arg1 = a & 0xff
  const arg2 = b & 0xff
  const res = arg1 - arg2
  const resb = res & 0xff
  const flags =
    (res & FLAG_SXY) |
    (resb ? 0 : FLAG_Z) |
    ((arg1 ^ arg2 ^ res) & FLAG_H) |
    (((arg1 ^ arg2) & (arg1 ^ res) & 0x80) >> 5) |
    FLAG_N |
    ((res >> 8) & 1)
  return { result: resb, flags }
}

export function sbc8(a: number, b: number, carryIn: number): Result8 {
  const arg1 = a & 0xff
  const arg2 = b & 0xff
  const res = arg1 - arg2 - (carryIn & 1)
  const resb = res & 0xff
  const flags =
    (res & FLAG_SXY) |
    (resb ? 0 : FLAG_Z) |
    ((arg1 ^ arg2 ^ res) & FLAG_H) |
    (((arg1 ^ arg2) & (arg1 ^ res) & 0x80) >> 5) |
    FLAG_N |
    ((res >> 8) & 1)
  return { result: resb, flags }
}

export function and8(a: number, b: number): Result8 {
  const res = (a & 0xff) & (b & 0xff)
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | FLAG_H | parity8(res)
  return { result: res, flags }
}

export function xor8(a: number, b: number): Result8 {
  const res = (a & 0xff) ^ (b & 0xff)
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res)
  return { result: res, flags }
}

export function or8(a: number, b: number): Result8 {
  const res = (a & 0xff) | (b & 0xff)
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res)
  return { result: res, flags }
}

/**
 * Like sub8 but does not return a usable result field for storage (CP discards it).
 * Famous Z80 quirk (checked by zexall, confirmed via its "aluop a,nn" CRC failing
 * without this): unlike every other ALU op, CP's undocumented X/Y flags come from
 * the *operand* being compared, not from the subtraction result. z80cmds.h's cp
 * macro literally uses `res & FLAG_SXY` (result-derived), which is the same class
 * of bug as the adc16/sbc16 shift-by-11 issue above -- deviated from here too.
 */
export function cp8(a: number, b: number): Result8 {
  const arg1 = a & 0xff
  const arg2 = b & 0xff
  const res = arg1 - arg2
  const resb = res & 0xff
  const flags =
    (res & FLAG_S) |
    (arg2 & (FLAG_X | FLAG_Y)) |
    (resb ? 0 : FLAG_Z) |
    ((arg1 ^ arg2 ^ res) & FLAG_H) |
    (((arg1 ^ arg2) & (arg1 ^ res) & 0x80) >> 5) |
    FLAG_N |
    ((res >> 8) & 1)
  return { result: resb, flags }
}

export function add16(a: number, b: number, oldFlags: number): Result16 {
  const arg1 = a & 0xffff
  const arg2 = b & 0xffff
  const res = arg1 + arg2
  const flags =
    (oldFlags & (FLAG_S | FLAG_Z | FLAG_P)) |
    ((res >> 8) & FLAG_XY) |
    (((arg1 ^ arg2 ^ res) >> 8) & FLAG_H) |
    (res >> 16)
  return { result: res & 0xffff, flags }
}

export function adc16(a: number, b: number, carryIn: number): Result16 {
  const arg1 = a & 0xffff
  const arg2 = b & 0xffff
  const res = arg1 + arg2 + (carryIn & 1)
  const resw = res & 0xffff
  const flags =
    ((res >> 8) & FLAG_SXY) |
    (resw ? 0 : FLAG_Z) |
    (((arg1 ^ arg2 ^ res) >> 8) & FLAG_H) |
    // Overflow (FLAG_V, bit 2): sign-of-operands-vs-sign-of-result trick scaled up
    // from add8's `>> 5` (bit7->bit2). z80cmds.h's adc16 macro literally shifts by
    // 11, which lands on bit4 (FLAG_H's bit) instead -- confirmed as a real bug via
    // zexdoc's "<adc,sbc> hl,<bc,de,hl,sp>" CRC test failing before this fix.
    (((arg1 ^ ~arg2) & (arg1 ^ res) & 0x8000) >> 13) |
    (res >> 16)
  return { result: resw, flags }
}

export function sbc16(a: number, b: number, carryIn: number): Result16 {
  const arg1 = a & 0xffff
  const arg2 = b & 0xffff
  const res = arg1 - arg2 - (carryIn & 1)
  const resw = res & 0xffff
  const flags =
    ((res >> 8) & FLAG_SXY) |
    (resw ? 0 : FLAG_Z) |
    (((arg1 ^ arg2 ^ res) >> 8) & FLAG_H) |
    // Same fix as adc16 above: >> 13 (not the source's >> 11) to land on FLAG_V's bit.
    (((arg1 ^ arg2) & (arg1 ^ res) & 0x8000) >> 13) |
    FLAG_N |
    ((res >> 16) & 1)
  return { result: resw, flags }
}

export function inc8(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const res = (arg + 1) & 0xff
  const flags =
    (res & FLAG_SXY) |
    (res ? 0 : FLAG_Z) |
    ((arg ^ res) & FLAG_H) |
    (res === 0x80 ? FLAG_V : 0) |
    (oldFlags & FLAG_C)
  return { result: res, flags }
}

export function dec8(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const res = (arg - 1) & 0xff
  const flags =
    (res & FLAG_SXY) |
    (res ? 0 : FLAG_Z) |
    ((arg ^ res) & FLAG_H) |
    (res === 0x7f ? FLAG_V : 0) |
    FLAG_N |
    (oldFlags & FLAG_C)
  return { result: res, flags }
}

export function cpl(a: number, oldFlags: number): Result8 {
  const res = ~a & 0xff
  const flags = (res & FLAG_XY) | FLAG_H | FLAG_N | (oldFlags & (FLAG_S | FLAG_Z | FLAG_P | FLAG_C))
  return { result: res, flags }
}

export function neg(a: number): Result8 {
  const arg = a & 0xff
  const res = -arg & 0xff
  const flags =
    (res & FLAG_SXY) |
    (res ? 0 : FLAG_Z) |
    ((arg ^ res) & FLAG_H) |
    (arg === 0x80 ? FLAG_V : 0) |
    FLAG_N |
    (arg ? FLAG_C : 0)
  return { result: res, flags }
}

/**
 * DAA, computed algorithmically per the documented Z80 behavior (equivalent to
 * tilem's precomputed daa_table, which encodes the same add/subtract correction
 * logic indexed by A/N/H/C). Verify against zexall once the CPU loop exists (M2/M3).
 */
export function daa(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const n = (oldFlags & FLAG_N) !== 0
  const hIn = (oldFlags & FLAG_H) !== 0
  const cIn = (oldFlags & FLAG_C) !== 0

  let corr = 0
  if (hIn || (arg & 0x0f) > 9) corr |= 0x06
  if (cIn || arg > 0x99) corr |= 0x60

  const res = (n ? arg - corr : arg + corr) & 0xff

  const hOut = n ? hIn && (arg & 0x0f) < 6 : (arg & 0x0f) > 9
  const cOut = cIn || arg > 0x99

  const flags =
    (res & FLAG_SXY) |
    (res ? 0 : FLAG_Z) |
    (hOut ? FLAG_H : 0) |
    parity8(res) |
    (n ? FLAG_N : 0) |
    (cOut ? FLAG_C : 0)

  return { result: res, flags }
}

export function rlca(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const res = ((arg << 1) | (arg >> 7)) & 0xff
  const flags = (oldFlags & (FLAG_S | FLAG_Z | FLAG_P)) | (res & FLAG_XYC)
  return { result: res, flags }
}

export function rrca(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const res = ((arg >> 1) | (arg << 7)) & 0xff
  const flags = (oldFlags & (FLAG_S | FLAG_Z | FLAG_P)) | (res & FLAG_XY) | (arg & FLAG_C)
  return { result: res, flags }
}

export function rla(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const res = ((arg << 1) | (oldFlags & 1)) & 0xff
  const flags = (oldFlags & (FLAG_S | FLAG_Z | FLAG_P)) | (res & FLAG_XY) | (arg >> 7)
  return { result: res, flags }
}

export function rra(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const res = ((arg >> 1) | ((oldFlags & 1) << 7)) & 0xff
  const flags = (oldFlags & (FLAG_S | FLAG_Z | FLAG_P)) | (res & FLAG_XY) | (arg & FLAG_C)
  return { result: res, flags }
}

export function rlc(a: number): Result8 {
  const arg = a & 0xff
  const res = ((arg << 1) | (arg >> 7)) & 0xff
  const flags = (res & FLAG_SXYC) | (res ? 0 : FLAG_Z) | parity8(res)
  return { result: res, flags }
}

export function rrc(a: number): Result8 {
  const arg = a & 0xff
  const res = ((arg >> 1) | (arg << 7)) & 0xff
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res) | (arg & FLAG_C)
  return { result: res, flags }
}

export function rl(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const res = ((arg << 1) | (oldFlags & 1)) & 0xff
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res) | (arg >> 7)
  return { result: res, flags }
}

export function rr(a: number, oldFlags: number): Result8 {
  const arg = a & 0xff
  const res = ((arg >> 1) | ((oldFlags & 1) << 7)) & 0xff
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res) | (arg & FLAG_C)
  return { result: res, flags }
}

export function sla(a: number): Result8 {
  const arg = a & 0xff
  const res = (arg << 1) & 0xff
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res) | (arg >> 7)
  return { result: res, flags }
}

export function sra(a: number): Result8 {
  const arg = a & 0xff
  const signed = (arg << 24) >> 24 // sign-extend the byte to a 32-bit int
  const res = (signed >> 1) & 0xff // arithmetic shift right, preserving the sign bit
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res) | (arg & FLAG_C)
  return { result: res, flags }
}

/** SLL / SL1, the undocumented "shift left, set bit 0" instruction. */
export function slia(a: number): Result8 {
  const arg = a & 0xff
  const res = ((arg << 1) | 1) & 0xff
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res) | (arg >> 7)
  return { result: res, flags }
}

export function srl(a: number): Result8 {
  const arg = a & 0xff
  const res = arg >> 1
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res) | (arg & FLAG_C)
  return { result: res, flags }
}

/** LD A,I / LD A,R: copies IFF2 into the P/V flag. */
export function ldAIR(value: number, iff2: number, oldFlags: number): Result8 {
  const res = value & 0xff
  const flags = (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | (iff2 ? FLAG_P : 0) | (oldFlags & FLAG_C)
  return { result: res, flags }
}

/** Shared by IN r,(C) and RLD/RRD: S/Z/X/Y from the result, P from its parity, C preserved. */
export function szpFlags(value: number, oldFlags: number): number {
  const res = value & 0xff
  return (res & FLAG_SXY) | (res ? 0 : FLAG_Z) | parity8(res) | (oldFlags & FLAG_C)
}

/** LDI/LDD flags: S/Z/C preserved, Y/X taken from the transferred byte, P from BC (after --BC) being nonzero. */
export function blockTransferFlags(transferredByte: number, bcAfterDecrement: number, oldFlags: number): number {
  const res = transferredByte & 0xff
  return (
    (oldFlags & (FLAG_S | FLAG_Z | FLAG_C)) |
    ((res << 4) & FLAG_Y) |
    (res & FLAG_X) |
    (bcAfterDecrement ? FLAG_P : 0)
  )
}

/** CPI/CPD flags. Ported from z80cmds.h's cpi/cpd macros. */
export function cpiCpdFlags(a: number, memValue: number, bcAfterDecrement: number, oldFlags: number): number {
  const arg1 = a & 0xff
  const arg2 = memValue & 0xff
  const res = arg1 - arg2
  const resb = res & 0xff
  const hc = (arg1 ^ arg2 ^ res) & 0x10
  const res2 = (res - (hc >> 4)) & 0xff
  return (
    (resb & FLAG_S) |
    (resb ? 0 : FLAG_Z) |
    ((res2 << 4) & FLAG_Y) |
    hc |
    (res2 & FLAG_X) |
    (bcAfterDecrement ? FLAG_P : 0) |
    FLAG_N |
    (oldFlags & FLAG_C)
  )
}

/**
 * INI/IND/OUTI/OUTD flags. Ported from z80cmds.h's ini/ind/outi/outd macros,
 * which all share this shape once `k` is computed by the caller (Z+value for
 * INI/IND, L+value for OUTI/OUTD -- see the differing macro bodies).
 */
export function blockIoFlags(value: number, k: number, countAfterDecB: number): number {
  const count = countAfterDecB & 0xff
  return (
    (count & FLAG_SXY) |
    (count ? 0 : FLAG_Z) |
    (k & 0x100 ? 0x11 : 0) |
    parity8((k & 7) ^ count) |
    ((value >> 6) & FLAG_N)
  )
}
