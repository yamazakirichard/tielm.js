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
 * DD/FD-prefixed (IX/IY-indexed) Z80 opcode table, ported from
 * tilem/emu/z80ddfd.h. `isIY` selects IX (false) or IY (true) in place of
 * the C header's PREFIX_DD/PREFIX_FD-conditional RegH/RegL/RegHL macros.
 * Any opcode not explicitly overridden here falls through to the base table
 * unmodified (`default: goto opcode_main` in the C source) -- DD/FD only
 * change behavior for opcodes that actually touch HL/H/L.
 */
import type { Z80 } from '../cpu.ts'
import { add16, adc8, and8, cp8, dec8, inc8, or8, sbc8, sub8, xor8, add8 } from '../flags.ts'
import { executeBase } from './base.ts'
import { executeCb } from './cb.ts'

function signed8(v: number): number {
  return (v << 24) >> 24
}

export function executeDdFd(cpu: Z80, op: number, isIY: boolean): void {
  const r = cpu.r
  const ixy = isIY ? r.iy : r.ix

  switch (op) {
    case 0x09 /* ADD IX, BC */: {
      r.wz.w = (ixy.w + 1) & 0xffff
      const res = add16(ixy.w, r.bc.w, r.f)
      ixy.w = res.result
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x19 /* ADD IX, DE */: {
      r.wz.w = (ixy.w + 1) & 0xffff
      const res = add16(ixy.w, r.de.w, r.f)
      ixy.w = res.result
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x21 /* LD IX, nn */:
      ixy.w = cpu.fetchWord()
      cpu.delay(10)
      break
    case 0x22 /* LD (nn), IX */:
      r.wz.w = cpu.fetchWord()
      cpu.writeByte(r.wz.w, ixy.l)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.writeByte(r.wz.w, ixy.h)
      cpu.delay(16)
      break
    case 0x23 /* INC IX */:
      ixy.w = (ixy.w + 1) & 0xffff
      cpu.delay(6)
      break
    case 0x24 /* INC IXH (undocumented) */: {
      const res = inc8(ixy.h, r.f)
      ixy.h = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x25 /* DEC IXH (undocumented) */: {
      const res = dec8(ixy.h, r.f)
      ixy.h = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x26 /* LD IXH, n (undocumented) */:
      ixy.h = cpu.fetchByte()
      cpu.delay(7)
      break
    case 0x29 /* ADD IX, IX */: {
      r.wz.w = (ixy.w + 1) & 0xffff
      const res = add16(ixy.w, ixy.w, r.f)
      ixy.w = res.result
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x2a /* LD IX, (nn) */:
      r.wz.w = cpu.fetchWord()
      ixy.l = cpu.readByte(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      ixy.h = cpu.readByte(r.wz.w)
      cpu.delay(16)
      break
    case 0x2b /* DEC IX */:
      ixy.w = (ixy.w - 1) & 0xffff
      cpu.delay(6)
      break
    case 0x2c /* INC IXL (undocumented) */: {
      const res = inc8(ixy.l, r.f)
      ixy.l = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x2d /* DEC IXL (undocumented) */: {
      const res = dec8(ixy.l, r.f)
      ixy.l = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x2e /* LD IXL, n (undocumented) */:
      ixy.l = cpu.fetchByte()
      cpu.delay(7)
      break

    case 0x34 /* INC (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.wz.w = (ixy.w + offs) & 0xffff
      const res = inc8(cpu.readByte(r.wz.w), r.f)
      cpu.writeByte(r.wz.w, res.result)
      r.f = res.flags
      cpu.delay(19)
      break
    }
    case 0x35 /* DEC (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.wz.w = (ixy.w + offs) & 0xffff
      const res = dec8(cpu.readByte(r.wz.w), r.f)
      cpu.writeByte(r.wz.w, res.result)
      r.f = res.flags
      cpu.delay(19)
      break
    }
    case 0x36 /* LD (IX+n), n */: {
      const offs = signed8(cpu.fetchByte())
      cpu.writeByte((ixy.w + offs) & 0xffff, cpu.fetchByte())
      cpu.delay(15) // "Yes, really!" -- tilem's comment; matches real hardware
      break
    }

    case 0x39 /* ADD IX, SP */: {
      r.wz.w = (ixy.w + 1) & 0xffff
      const res = add16(ixy.w, r.sp.w, r.f)
      ixy.w = res.result
      r.f = res.flags
      cpu.delay(11)
      break
    }

    case 0x44 /* LD B, IXH */:
      r.bc.h = ixy.h
      cpu.delay(4)
      break
    case 0x45 /* LD B, IXL */:
      r.bc.h = ixy.l
      cpu.delay(4)
      break
    case 0x46 /* LD B, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.bc.h = cpu.readByte((ixy.w + offs) & 0xffff)
      cpu.delay(15)
      break
    }

    case 0x4c /* LD C, IXH */:
      r.bc.l = ixy.h
      cpu.delay(4)
      break
    case 0x4d /* LD C, IXL */:
      r.bc.l = ixy.l
      cpu.delay(4)
      break
    case 0x4e /* LD C, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.bc.l = cpu.readByte((ixy.w + offs) & 0xffff)
      cpu.delay(15)
      break
    }

    case 0x54 /* LD D, IXH */:
      r.de.h = ixy.h
      cpu.delay(4)
      break
    case 0x55 /* LD D, IXL */:
      r.de.h = ixy.l
      cpu.delay(4)
      break
    case 0x56 /* LD D, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.de.h = cpu.readByte((ixy.w + offs) & 0xffff)
      cpu.delay(15)
      break
    }

    case 0x5c /* LD E, IXH */:
      r.de.l = ixy.h
      cpu.delay(4)
      break
    case 0x5d /* LD E, IXL */:
      r.de.l = ixy.l
      cpu.delay(4)
      break
    case 0x5e /* LD E, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.de.l = cpu.readByte((ixy.w + offs) & 0xffff)
      cpu.delay(15)
      break
    }

    case 0x60 /* LD IXH, B */:
      ixy.h = r.bc.h
      cpu.delay(4)
      break
    case 0x61 /* LD IXH, C */:
      ixy.h = r.bc.l
      cpu.delay(4)
      break
    case 0x62 /* LD IXH, D */:
      ixy.h = r.de.h
      cpu.delay(4)
      break
    case 0x63 /* LD IXH, E */:
      ixy.h = r.de.l
      cpu.delay(4)
      break
    case 0x64 /* LD IXH, IXH */:
      cpu.delay(4)
      break
    case 0x65 /* LD IXH, IXL */:
      ixy.h = ixy.l
      cpu.delay(4)
      break
    case 0x66 /* LD H, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.hl.h = cpu.readByte((ixy.w + offs) & 0xffff)
      cpu.delay(15)
      break
    }
    case 0x67 /* LD IXH, A */:
      ixy.h = r.a
      cpu.delay(4)
      break

    case 0x68 /* LD IXL, B */:
      ixy.l = r.bc.h
      cpu.delay(4)
      break
    case 0x69 /* LD IXL, C */:
      ixy.l = r.bc.l
      cpu.delay(4)
      break
    case 0x6a /* LD IXL, D */:
      ixy.l = r.de.h
      cpu.delay(4)
      break
    case 0x6b /* LD IXL, E */:
      ixy.l = r.de.l
      cpu.delay(4)
      break
    case 0x6c /* LD IXL, IXH */:
      ixy.l = ixy.h
      cpu.delay(4)
      break
    case 0x6d /* LD IXL, IXL */:
      cpu.delay(4)
      break
    case 0x6e /* LD L, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.hl.l = cpu.readByte((ixy.w + offs) & 0xffff)
      cpu.delay(15)
      break
    }
    case 0x6f /* LD IXL, A */:
      ixy.l = r.a
      cpu.delay(4)
      break

    case 0x70 /* LD (IX+n), B */: {
      const offs = signed8(cpu.fetchByte())
      cpu.writeByte((ixy.w + offs) & 0xffff, r.bc.h)
      cpu.delay(15)
      break
    }
    case 0x71 /* LD (IX+n), C */: {
      const offs = signed8(cpu.fetchByte())
      cpu.writeByte((ixy.w + offs) & 0xffff, r.bc.l)
      cpu.delay(15)
      break
    }
    case 0x72 /* LD (IX+n), D */: {
      const offs = signed8(cpu.fetchByte())
      cpu.writeByte((ixy.w + offs) & 0xffff, r.de.h)
      cpu.delay(15)
      break
    }
    case 0x73 /* LD (IX+n), E */: {
      const offs = signed8(cpu.fetchByte())
      cpu.writeByte((ixy.w + offs) & 0xffff, r.de.l)
      cpu.delay(15)
      break
    }
    case 0x74 /* LD (IX+n), H */: {
      const offs = signed8(cpu.fetchByte())
      cpu.writeByte((ixy.w + offs) & 0xffff, r.hl.h)
      cpu.delay(15)
      break
    }
    case 0x75 /* LD (IX+n), L */: {
      const offs = signed8(cpu.fetchByte())
      cpu.writeByte((ixy.w + offs) & 0xffff, r.hl.l)
      cpu.delay(15)
      break
    }
    case 0x77 /* LD (IX+n), A */: {
      const offs = signed8(cpu.fetchByte())
      cpu.writeByte((ixy.w + offs) & 0xffff, r.a)
      cpu.delay(15)
      break
    }

    case 0x7c /* LD A, IXH */:
      r.a = ixy.h
      cpu.delay(4)
      break
    case 0x7d /* LD A, IXL */:
      r.a = ixy.l
      cpu.delay(4)
      break
    case 0x7e /* LD A, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.a = cpu.readByte((ixy.w + offs) & 0xffff)
      cpu.delay(15)
      break
    }

    case 0x84 /* ADD A, IXH */:
      applyAlu8(r, add8(r.a, ixy.h))
      cpu.delay(4)
      break
    case 0x85 /* ADD A, IXL */:
      applyAlu8(r, add8(r.a, ixy.l))
      cpu.delay(4)
      break
    case 0x86 /* ADD A, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      applyAlu8(r, add8(r.a, cpu.readByte((ixy.w + offs) & 0xffff)))
      cpu.delay(19)
      break
    }

    case 0x8c /* ADC A, IXH */:
      applyAlu8(r, adc8(r.a, ixy.h, r.f))
      cpu.delay(4)
      break
    case 0x8d /* ADC A, IXL */:
      applyAlu8(r, adc8(r.a, ixy.l, r.f))
      cpu.delay(4)
      break
    case 0x8e /* ADC A, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      applyAlu8(r, adc8(r.a, cpu.readByte((ixy.w + offs) & 0xffff), r.f))
      cpu.delay(19)
      break
    }

    case 0x94 /* SUB IXH */:
      applyAlu8(r, sub8(r.a, ixy.h))
      cpu.delay(4)
      break
    case 0x95 /* SUB IXL */:
      applyAlu8(r, sub8(r.a, ixy.l))
      cpu.delay(4)
      break
    case 0x96 /* SUB (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      applyAlu8(r, sub8(r.a, cpu.readByte((ixy.w + offs) & 0xffff)))
      cpu.delay(19)
      break
    }

    case 0x9c /* SBC A, IXH */:
      applyAlu8(r, sbc8(r.a, ixy.h, r.f))
      cpu.delay(4)
      break
    case 0x9d /* SBC A, IXL */:
      applyAlu8(r, sbc8(r.a, ixy.l, r.f))
      cpu.delay(4)
      break
    case 0x9e /* SBC A, (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      applyAlu8(r, sbc8(r.a, cpu.readByte((ixy.w + offs) & 0xffff), r.f))
      cpu.delay(19)
      break
    }

    case 0xa4 /* AND IXH */:
      applyAlu8(r, and8(r.a, ixy.h))
      cpu.delay(4)
      break
    case 0xa5 /* AND IXL */:
      applyAlu8(r, and8(r.a, ixy.l))
      cpu.delay(4)
      break
    case 0xa6 /* AND (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      applyAlu8(r, and8(r.a, cpu.readByte((ixy.w + offs) & 0xffff)))
      cpu.delay(19)
      break
    }

    case 0xac /* XOR IXH */:
      applyAlu8(r, xor8(r.a, ixy.h))
      cpu.delay(4)
      break
    case 0xad /* XOR IXL */:
      applyAlu8(r, xor8(r.a, ixy.l))
      cpu.delay(4)
      break
    case 0xae /* XOR (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      applyAlu8(r, xor8(r.a, cpu.readByte((ixy.w + offs) & 0xffff)))
      cpu.delay(19)
      break
    }

    case 0xb4 /* OR IXH */:
      applyAlu8(r, or8(r.a, ixy.h))
      cpu.delay(4)
      break
    case 0xb5 /* OR IXL */:
      applyAlu8(r, or8(r.a, ixy.l))
      cpu.delay(4)
      break
    case 0xb6 /* OR (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      applyAlu8(r, or8(r.a, cpu.readByte((ixy.w + offs) & 0xffff)))
      cpu.delay(19)
      break
    }

    case 0xbc /* CP IXH */:
      r.f = cp8(r.a, ixy.h).flags
      cpu.delay(4)
      break
    case 0xbd /* CP IXL */:
      r.f = cp8(r.a, ixy.l).flags
      cpu.delay(4)
      break
    case 0xbe /* CP (IX+n) */: {
      const offs = signed8(cpu.fetchByte())
      r.f = cp8(r.a, cpu.readByte((ixy.w + offs) & 0xffff)).flags
      cpu.delay(19)
      break
    }

    case 0xcb /* DD/FD CB d op */: {
      const offs = signed8(cpu.fetchByte())
      const addr = (ixy.w + offs) & 0xffff
      r.wz.w = addr
      const subOp = cpu.fetchByte()
      executeCb(cpu, subOp, addr)
      break
    }

    case 0xe1 /* POP IX */:
      ixy.w = cpu.pop()
      cpu.delay(10)
      break
    case 0xe3 /* EX (SP), IX */: {
      const tmp = cpu.readWord(r.sp.w)
      cpu.writeWord(r.sp.w, ixy.w)
      ixy.w = tmp
      r.wz.w = tmp
      cpu.delay(19)
      break
    }
    case 0xe5 /* PUSH IX */:
      cpu.push(ixy.w)
      cpu.delay(11)
      break

    case 0xe9 /* JP (IX) */:
      r.pc.w = ixy.w
      cpu.delay(4)
      break

    case 0xf9 /* LD SP, IX */:
      r.sp.w = ixy.w
      cpu.delay(4)
      break

    default:
      // Any opcode DD/FD doesn't override behaves exactly like the base table
      // (real hardware: the prefix is wasted, e.g. DD 00 == NOP + 4 wasted cycles).
      executeBase(cpu, op)
      break
  }
}

function applyAlu8(r: { a: number; f: number }, res: { result: number; flags: number }): void {
  r.a = res.result
  r.f = res.flags
}
