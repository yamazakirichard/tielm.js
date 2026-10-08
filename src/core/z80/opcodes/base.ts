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
 * Base (unprefixed) Z80 opcode table, ported nearly verbatim from
 * tilem/emu/z80main.h. Each case mirrors the corresponding C case block;
 * `delay(n)` calls become `cpu.delay(n)`, `readb(PC++)`/`readw(PC);PC+=2`
 * become `cpu.fetchByte()`/`cpu.fetchWord()`, and the flag-computing macros
 * (`add8`, `inc`, `daa`, `rlca`, ...) become calls into ../flags.ts.
 *
 * CB/DD/ED/FD prefix bytes are handled by the caller (cpu.ts); they never
 * reach this switch.
 */
import { swapWords, type Z80 } from '../cpu.ts'
import {
  FLAG_C,
  FLAG_P,
  FLAG_S,
  FLAG_Z,
  add16,
  add8,
  adc8,
  and8,
  cp8,
  cpl,
  daa,
  dec8,
  inc8,
  or8,
  rla,
  rlca,
  rra,
  rrca,
  sbc8,
  sub8,
  xor8,
} from '../flags.ts'

export function executeBase(cpu: Z80, op: number): void {
  const r = cpu.r

  switch (op) {
    case 0x00 /* NOP */:
      cpu.delay(4)
      break
    case 0x01 /* LD BC, nn */:
      r.bc.w = cpu.fetchWord()
      cpu.delay(10)
      break
    case 0x02 /* LD (BC), A */:
      r.wz.h = r.a
      cpu.writeByte(r.bc.w, r.a)
      cpu.delay(7)
      break
    case 0x03 /* INC BC */:
      r.bc.w = (r.bc.w + 1) & 0xffff
      cpu.delay(6)
      break
    case 0x04 /* INC B */: {
      const res = inc8(r.bc.h, r.f)
      r.bc.h = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x05 /* DEC B */: {
      const res = dec8(r.bc.h, r.f)
      r.bc.h = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x06 /* LD B, n */:
      r.bc.h = cpu.fetchByte()
      cpu.delay(7)
      break
    case 0x07 /* RLCA */: {
      const res = rlca(r.a, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }

    case 0x08 /* EX AF, AF' */:
      swapWords(r.af, r.af2)
      cpu.delay(4)
      break
    case 0x09 /* ADD HL, BC */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = add16(r.hl.w, r.bc.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x0a /* LD A, (BC) */:
      r.wz.w = r.bc.w
      r.a = cpu.readByte(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(7)
      break
    case 0x0b /* DEC BC */:
      r.bc.w = (r.bc.w - 1) & 0xffff
      cpu.delay(6)
      break
    case 0x0c /* INC C */: {
      const res = inc8(r.bc.l, r.f)
      r.bc.l = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x0d /* DEC C */: {
      const res = dec8(r.bc.l, r.f)
      r.bc.l = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x0e /* LD C, n */:
      r.bc.l = cpu.fetchByte()
      cpu.delay(7)
      break
    case 0x0f /* RRCA */: {
      const res = rrca(r.a, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }

    case 0x10 /* DJNZ $+n */: {
      const offs = signed8(cpu.fetchByte())
      r.bc.h = (r.bc.h - 1) & 0xff
      if (r.bc.h) {
        r.wz.w = (r.pc.w + offs) & 0xffff
        r.pc.w = r.wz.w
        cpu.delay(13)
      } else {
        cpu.delay(8)
      }
      break
    }
    case 0x11 /* LD DE, nn */:
      r.de.w = cpu.fetchWord()
      cpu.delay(10)
      break
    case 0x12 /* LD (DE), A */:
      r.wz.h = r.a
      cpu.writeByte(r.de.w, r.a)
      cpu.delay(7)
      break
    case 0x13 /* INC DE */:
      r.de.w = (r.de.w + 1) & 0xffff
      cpu.delay(6)
      break
    case 0x14 /* INC D */: {
      const res = inc8(r.de.h, r.f)
      r.de.h = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x15 /* DEC D */: {
      const res = dec8(r.de.h, r.f)
      r.de.h = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x16 /* LD D, n */:
      r.de.h = cpu.fetchByte()
      cpu.delay(7)
      break
    case 0x17 /* RLA */: {
      const res = rla(r.a, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }

    case 0x18 /* JR $+n */: {
      const offs = signed8(cpu.fetchByte())
      r.wz.w = (r.pc.w + offs) & 0xffff
      r.pc.w = r.wz.w
      cpu.delay(12)
      break
    }
    case 0x19 /* ADD HL, DE */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = add16(r.hl.w, r.de.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x1a /* LD A, (DE) */:
      r.wz.w = r.de.w
      r.a = cpu.readByte(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(7)
      break
    case 0x1b /* DEC DE */:
      r.de.w = (r.de.w - 1) & 0xffff
      cpu.delay(6)
      break
    case 0x1c /* INC E */: {
      const res = inc8(r.de.l, r.f)
      r.de.l = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x1d /* DEC E */: {
      const res = dec8(r.de.l, r.f)
      r.de.l = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x1e /* LD E, n */:
      r.de.l = cpu.fetchByte()
      cpu.delay(7)
      break
    case 0x1f /* RRA */: {
      const res = rra(r.a, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }

    case 0x20 /* JR NZ, $+n */: {
      const offs = signed8(cpu.fetchByte())
      if (!(r.f & FLAG_Z)) {
        r.wz.w = (r.pc.w + offs) & 0xffff
        r.pc.w = r.wz.w
        cpu.delay(12)
      } else {
        cpu.delay(7)
      }
      break
    }
    case 0x21 /* LD HL, nn */:
      r.hl.w = cpu.fetchWord()
      cpu.delay(10)
      break
    case 0x22 /* LD (nn), HL */:
      r.wz.w = cpu.fetchWord()
      cpu.writeWord(r.wz.w, r.hl.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(16)
      break
    case 0x23 /* INC HL */:
      r.hl.w = (r.hl.w + 1) & 0xffff
      cpu.delay(6)
      break
    case 0x24 /* INC H */: {
      const res = inc8(r.hl.h, r.f)
      r.hl.h = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x25 /* DEC H */: {
      const res = dec8(r.hl.h, r.f)
      r.hl.h = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x26 /* LD H, n */:
      r.hl.h = cpu.fetchByte()
      cpu.delay(7)
      break
    case 0x27 /* DAA */: {
      const res = daa(r.a, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }

    case 0x28 /* JR Z, $+n */: {
      const offs = signed8(cpu.fetchByte())
      if (r.f & FLAG_Z) {
        r.wz.w = (r.pc.w + offs) & 0xffff
        r.pc.w = r.wz.w
        cpu.delay(12)
      } else {
        cpu.delay(7)
      }
      break
    }
    case 0x29 /* ADD HL, HL */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = add16(r.hl.w, r.hl.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x2a /* LD HL, (nn) */:
      r.wz.w = cpu.fetchWord()
      r.hl.w = cpu.readWord(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(16)
      break
    case 0x2b /* DEC HL */:
      r.hl.w = (r.hl.w - 1) & 0xffff
      cpu.delay(6)
      break
    case 0x2c /* INC L */: {
      const res = inc8(r.hl.l, r.f)
      r.hl.l = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x2d /* DEC L */: {
      const res = dec8(r.hl.l, r.f)
      r.hl.l = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x2e /* LD L, n */:
      r.hl.l = cpu.fetchByte()
      cpu.delay(7)
      break
    case 0x2f /* CPL */: {
      const res = cpl(r.a, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }

    case 0x30 /* JR NC, $+n */: {
      const offs = signed8(cpu.fetchByte())
      if (!(r.f & FLAG_C)) {
        r.wz.w = (r.pc.w + offs) & 0xffff
        r.pc.w = r.wz.w
        cpu.delay(12)
      } else {
        cpu.delay(7)
      }
      break
    }
    case 0x31 /* LD SP, nn */:
      r.sp.w = cpu.fetchWord()
      cpu.delay(10)
      break
    case 0x32 /* LD (nn), A */: {
      const addr = cpu.fetchWord()
      cpu.writeByte(addr, r.a)
      r.wz.h = r.a // matches tilem's "is this really correct?!" comment
      cpu.delay(13)
      break
    }
    case 0x33 /* INC SP */:
      r.sp.w = (r.sp.w + 1) & 0xffff
      cpu.delay(6)
      break
    case 0x34 /* INC (HL) */: {
      const res = inc8(cpu.readByte(r.hl.w), r.f)
      cpu.writeByte(r.hl.w, res.result)
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x35 /* DEC (HL) */: {
      const res = dec8(cpu.readByte(r.hl.w), r.f)
      cpu.writeByte(r.hl.w, res.result)
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x36 /* LD (HL), n */:
      cpu.writeByte(r.hl.w, cpu.fetchByte())
      cpu.delay(10)
      break
    case 0x37 /* SCF */:
      r.f |= FLAG_C
      cpu.delay(4)
      break
    case 0x38 /* JR C, $+n */: {
      const offs = signed8(cpu.fetchByte())
      if (r.f & FLAG_C) {
        r.wz.w = (r.pc.w + offs) & 0xffff
        r.pc.w = r.wz.w
        cpu.delay(12)
      } else {
        cpu.delay(7)
      }
      break
    }
    case 0x39 /* ADD HL, SP */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = add16(r.hl.w, r.sp.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(11)
      break
    }
    case 0x3a /* LD A, (nn) */:
      r.wz.w = cpu.fetchWord()
      r.a = cpu.readByte(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(13)
      break
    case 0x3b /* DEC SP */:
      r.sp.w = (r.sp.w - 1) & 0xffff
      cpu.delay(6)
      break
    case 0x3c /* INC A */: {
      const res = inc8(r.a, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x3d /* DEC A */: {
      const res = dec8(r.a, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(4)
      break
    }
    case 0x3e /* LD A, n */:
      r.a = cpu.fetchByte()
      cpu.delay(7)
      break
    case 0x3f /* CCF */:
      r.f ^= FLAG_C
      cpu.delay(4)
      break

    // 0x40-0x7F: LD r,r' / LD r,(HL) / LD (HL),r / HALT
    case 0x40:
      cpu.delay(4)
      break // LD B,B (no-op)
    case 0x41:
      r.bc.h = r.bc.l
      cpu.delay(4)
      break
    case 0x42:
      r.bc.h = r.de.h
      cpu.delay(4)
      break
    case 0x43:
      r.bc.h = r.de.l
      cpu.delay(4)
      break
    case 0x44:
      r.bc.h = r.hl.h
      cpu.delay(4)
      break
    case 0x45:
      r.bc.h = r.hl.l
      cpu.delay(4)
      break
    case 0x46:
      r.bc.h = cpu.readByte(r.hl.w)
      cpu.delay(7)
      break
    case 0x47:
      r.bc.h = r.a
      cpu.delay(4)
      break
    case 0x48:
      r.bc.l = r.bc.h
      cpu.delay(4)
      break
    case 0x49:
      cpu.delay(4)
      break // LD C,C
    case 0x4a:
      r.bc.l = r.de.h
      cpu.delay(4)
      break
    case 0x4b:
      r.bc.l = r.de.l
      cpu.delay(4)
      break
    case 0x4c:
      r.bc.l = r.hl.h
      cpu.delay(4)
      break
    case 0x4d:
      r.bc.l = r.hl.l
      cpu.delay(4)
      break
    case 0x4e:
      r.bc.l = cpu.readByte(r.hl.w)
      cpu.delay(7)
      break
    case 0x4f:
      r.bc.l = r.a
      cpu.delay(4)
      break
    case 0x50:
      r.de.h = r.bc.h
      cpu.delay(4)
      break
    case 0x51:
      r.de.h = r.bc.l
      cpu.delay(4)
      break
    case 0x52:
      cpu.delay(4)
      break // LD D,D
    case 0x53:
      r.de.h = r.de.l
      cpu.delay(4)
      break
    case 0x54:
      r.de.h = r.hl.h
      cpu.delay(4)
      break
    case 0x55:
      r.de.h = r.hl.l
      cpu.delay(4)
      break
    case 0x56:
      r.de.h = cpu.readByte(r.hl.w)
      cpu.delay(7)
      break
    case 0x57:
      r.de.h = r.a
      cpu.delay(4)
      break
    case 0x58:
      r.de.l = r.bc.h
      cpu.delay(4)
      break
    case 0x59:
      r.de.l = r.bc.l
      cpu.delay(4)
      break
    case 0x5a:
      r.de.l = r.de.h
      cpu.delay(4)
      break
    case 0x5b:
      cpu.delay(4)
      break // LD E,E
    case 0x5c:
      r.de.l = r.hl.h
      cpu.delay(4)
      break
    case 0x5d:
      r.de.l = r.hl.l
      cpu.delay(4)
      break
    case 0x5e:
      r.de.l = cpu.readByte(r.hl.w)
      cpu.delay(7)
      break
    case 0x5f:
      r.de.l = r.a
      cpu.delay(4)
      break
    case 0x60:
      r.hl.h = r.bc.h
      cpu.delay(4)
      break
    case 0x61:
      r.hl.h = r.bc.l
      cpu.delay(4)
      break
    case 0x62:
      r.hl.h = r.de.h
      cpu.delay(4)
      break
    case 0x63:
      r.hl.h = r.de.l
      cpu.delay(4)
      break
    case 0x64:
      cpu.delay(4)
      break // LD H,H
    case 0x65:
      r.hl.h = r.hl.l
      cpu.delay(4)
      break
    case 0x66:
      r.hl.h = cpu.readByte(r.hl.w)
      cpu.delay(7)
      break
    case 0x67:
      r.hl.h = r.a
      cpu.delay(4)
      break
    case 0x68:
      r.hl.l = r.bc.h
      cpu.delay(4)
      break
    case 0x69:
      r.hl.l = r.bc.l
      cpu.delay(4)
      break
    case 0x6a:
      r.hl.l = r.de.h
      cpu.delay(4)
      break
    case 0x6b:
      r.hl.l = r.de.l
      cpu.delay(4)
      break
    case 0x6c:
      r.hl.l = r.hl.h
      cpu.delay(4)
      break
    case 0x6d:
      cpu.delay(4)
      break // LD L,L
    case 0x6e:
      r.hl.l = cpu.readByte(r.hl.w)
      cpu.delay(7)
      break
    case 0x6f:
      r.hl.l = r.a
      cpu.delay(4)
      break
    case 0x70:
      cpu.writeByte(r.hl.w, r.bc.h)
      cpu.delay(7)
      break
    case 0x71:
      cpu.writeByte(r.hl.w, r.bc.l)
      cpu.delay(7)
      break
    case 0x72:
      cpu.writeByte(r.hl.w, r.de.h)
      cpu.delay(7)
      break
    case 0x73:
      cpu.writeByte(r.hl.w, r.de.l)
      cpu.delay(7)
      break
    case 0x74:
      cpu.writeByte(r.hl.w, r.hl.h)
      cpu.delay(7)
      break
    case 0x75:
      cpu.writeByte(r.hl.w, r.hl.l)
      cpu.delay(7)
      break
    case 0x76 /* HALT */:
      cpu.halted = true
      cpu.delay(4)
      break
    case 0x77:
      cpu.writeByte(r.hl.w, r.a)
      cpu.delay(7)
      break
    case 0x78:
      r.a = r.bc.h
      cpu.delay(4)
      break
    case 0x79:
      r.a = r.bc.l
      cpu.delay(4)
      break
    case 0x7a:
      r.a = r.de.h
      cpu.delay(4)
      break
    case 0x7b:
      r.a = r.de.l
      cpu.delay(4)
      break
    case 0x7c:
      r.a = r.hl.h
      cpu.delay(4)
      break
    case 0x7d:
      r.a = r.hl.l
      cpu.delay(4)
      break
    case 0x7e:
      r.a = cpu.readByte(r.hl.w)
      cpu.delay(7)
      break
    case 0x7f:
      cpu.delay(4)
      break // LD A,A

    // 0x80-0xBF: ALU A,r
    case 0x80:
      applyAlu8(r, add8(r.a, r.bc.h))
      cpu.delay(4)
      break
    case 0x81:
      applyAlu8(r, add8(r.a, r.bc.l))
      cpu.delay(4)
      break
    case 0x82:
      applyAlu8(r, add8(r.a, r.de.h))
      cpu.delay(4)
      break
    case 0x83:
      applyAlu8(r, add8(r.a, r.de.l))
      cpu.delay(4)
      break
    case 0x84:
      applyAlu8(r, add8(r.a, r.hl.h))
      cpu.delay(4)
      break
    case 0x85:
      applyAlu8(r, add8(r.a, r.hl.l))
      cpu.delay(4)
      break
    case 0x86:
      applyAlu8(r, add8(r.a, cpu.readByte(r.hl.w)))
      cpu.delay(7)
      break
    case 0x87:
      applyAlu8(r, add8(r.a, r.a))
      cpu.delay(4)
      break
    case 0x88:
      applyAlu8(r, adc8(r.a, r.bc.h, r.f))
      cpu.delay(4)
      break
    case 0x89:
      applyAlu8(r, adc8(r.a, r.bc.l, r.f))
      cpu.delay(4)
      break
    case 0x8a:
      applyAlu8(r, adc8(r.a, r.de.h, r.f))
      cpu.delay(4)
      break
    case 0x8b:
      applyAlu8(r, adc8(r.a, r.de.l, r.f))
      cpu.delay(4)
      break
    case 0x8c:
      applyAlu8(r, adc8(r.a, r.hl.h, r.f))
      cpu.delay(4)
      break
    case 0x8d:
      applyAlu8(r, adc8(r.a, r.hl.l, r.f))
      cpu.delay(4)
      break
    case 0x8e:
      applyAlu8(r, adc8(r.a, cpu.readByte(r.hl.w), r.f))
      cpu.delay(7)
      break
    case 0x8f:
      applyAlu8(r, adc8(r.a, r.a, r.f))
      cpu.delay(4)
      break
    case 0x90:
      applyAlu8(r, sub8(r.a, r.bc.h))
      cpu.delay(4)
      break
    case 0x91:
      applyAlu8(r, sub8(r.a, r.bc.l))
      cpu.delay(4)
      break
    case 0x92:
      applyAlu8(r, sub8(r.a, r.de.h))
      cpu.delay(4)
      break
    case 0x93:
      applyAlu8(r, sub8(r.a, r.de.l))
      cpu.delay(4)
      break
    case 0x94:
      applyAlu8(r, sub8(r.a, r.hl.h))
      cpu.delay(4)
      break
    case 0x95:
      applyAlu8(r, sub8(r.a, r.hl.l))
      cpu.delay(4)
      break
    case 0x96:
      applyAlu8(r, sub8(r.a, cpu.readByte(r.hl.w)))
      cpu.delay(7)
      break
    case 0x97:
      applyAlu8(r, sub8(r.a, r.a))
      cpu.delay(4)
      break
    case 0x98:
      applyAlu8(r, sbc8(r.a, r.bc.h, r.f))
      cpu.delay(4)
      break
    case 0x99:
      applyAlu8(r, sbc8(r.a, r.bc.l, r.f))
      cpu.delay(4)
      break
    case 0x9a:
      applyAlu8(r, sbc8(r.a, r.de.h, r.f))
      cpu.delay(4)
      break
    case 0x9b:
      applyAlu8(r, sbc8(r.a, r.de.l, r.f))
      cpu.delay(4)
      break
    case 0x9c:
      applyAlu8(r, sbc8(r.a, r.hl.h, r.f))
      cpu.delay(4)
      break
    case 0x9d:
      applyAlu8(r, sbc8(r.a, r.hl.l, r.f))
      cpu.delay(4)
      break
    case 0x9e:
      applyAlu8(r, sbc8(r.a, cpu.readByte(r.hl.w), r.f))
      cpu.delay(7)
      break
    case 0x9f:
      applyAlu8(r, sbc8(r.a, r.a, r.f))
      cpu.delay(4)
      break
    case 0xa0:
      applyAlu8(r, and8(r.a, r.bc.h))
      cpu.delay(4)
      break
    case 0xa1:
      applyAlu8(r, and8(r.a, r.bc.l))
      cpu.delay(4)
      break
    case 0xa2:
      applyAlu8(r, and8(r.a, r.de.h))
      cpu.delay(4)
      break
    case 0xa3:
      applyAlu8(r, and8(r.a, r.de.l))
      cpu.delay(4)
      break
    case 0xa4:
      applyAlu8(r, and8(r.a, r.hl.h))
      cpu.delay(4)
      break
    case 0xa5:
      applyAlu8(r, and8(r.a, r.hl.l))
      cpu.delay(4)
      break
    case 0xa6:
      applyAlu8(r, and8(r.a, cpu.readByte(r.hl.w)))
      cpu.delay(7)
      break
    case 0xa7:
      applyAlu8(r, and8(r.a, r.a))
      cpu.delay(4)
      break
    case 0xa8:
      applyAlu8(r, xor8(r.a, r.bc.h))
      cpu.delay(4)
      break
    case 0xa9:
      applyAlu8(r, xor8(r.a, r.bc.l))
      cpu.delay(4)
      break
    case 0xaa:
      applyAlu8(r, xor8(r.a, r.de.h))
      cpu.delay(4)
      break
    case 0xab:
      applyAlu8(r, xor8(r.a, r.de.l))
      cpu.delay(4)
      break
    case 0xac:
      applyAlu8(r, xor8(r.a, r.hl.h))
      cpu.delay(4)
      break
    case 0xad:
      applyAlu8(r, xor8(r.a, r.hl.l))
      cpu.delay(4)
      break
    case 0xae:
      applyAlu8(r, xor8(r.a, cpu.readByte(r.hl.w)))
      cpu.delay(7)
      break
    case 0xaf:
      applyAlu8(r, xor8(r.a, r.a))
      cpu.delay(4)
      break
    case 0xb0:
      applyAlu8(r, or8(r.a, r.bc.h))
      cpu.delay(4)
      break
    case 0xb1:
      applyAlu8(r, or8(r.a, r.bc.l))
      cpu.delay(4)
      break
    case 0xb2:
      applyAlu8(r, or8(r.a, r.de.h))
      cpu.delay(4)
      break
    case 0xb3:
      applyAlu8(r, or8(r.a, r.de.l))
      cpu.delay(4)
      break
    case 0xb4:
      applyAlu8(r, or8(r.a, r.hl.h))
      cpu.delay(4)
      break
    case 0xb5:
      applyAlu8(r, or8(r.a, r.hl.l))
      cpu.delay(4)
      break
    case 0xb6:
      applyAlu8(r, or8(r.a, cpu.readByte(r.hl.w)))
      cpu.delay(7)
      break
    case 0xb7:
      applyAlu8(r, or8(r.a, r.a))
      cpu.delay(4)
      break
    case 0xb8:
      r.f = cp8(r.a, r.bc.h).flags
      cpu.delay(4)
      break
    case 0xb9:
      r.f = cp8(r.a, r.bc.l).flags
      cpu.delay(4)
      break
    case 0xba:
      r.f = cp8(r.a, r.de.h).flags
      cpu.delay(4)
      break
    case 0xbb:
      r.f = cp8(r.a, r.de.l).flags
      cpu.delay(4)
      break
    case 0xbc:
      r.f = cp8(r.a, r.hl.h).flags
      cpu.delay(4)
      break
    case 0xbd:
      r.f = cp8(r.a, r.hl.l).flags
      cpu.delay(4)
      break
    case 0xbe:
      r.f = cp8(r.a, cpu.readByte(r.hl.w)).flags
      cpu.delay(7)
      break
    case 0xbf:
      r.f = cp8(r.a, r.a).flags
      cpu.delay(4)
      break

    case 0xc0 /* RET NZ */:
      if (!(r.f & FLAG_Z)) {
        r.wz.w = cpu.pop()
        r.pc.w = r.wz.w
        cpu.delay(11)
      } else {
        cpu.delay(5)
      }
      break
    case 0xc1 /* POP BC */:
      r.bc.w = cpu.pop()
      cpu.delay(10)
      break
    case 0xc2 /* JP NZ, nn */:
      r.wz.w = cpu.fetchWord()
      if (!(r.f & FLAG_Z)) r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xc3 /* JP nn */:
      r.wz.w = cpu.fetchWord()
      r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xc4 /* CALL NZ, nn */:
      r.wz.w = cpu.fetchWord()
      if (!(r.f & FLAG_Z)) {
        cpu.push(r.pc.w)
        r.pc.w = r.wz.w
        cpu.delay(17)
      } else {
        cpu.delay(10)
      }
      break
    case 0xc5 /* PUSH BC */:
      cpu.push(r.bc.w)
      cpu.delay(11)
      break
    case 0xc6 /* ADD A, n */:
      applyAlu8(r, add8(r.a, cpu.fetchByte()))
      cpu.delay(7)
      break
    case 0xc7 /* RST 00h */:
      cpu.push(r.pc.w)
      r.pc.w = 0x0000
      cpu.delay(11)
      break

    case 0xc8 /* RET Z */:
      if (r.f & FLAG_Z) {
        r.wz.w = cpu.pop()
        r.pc.w = r.wz.w
        cpu.delay(11)
      } else {
        cpu.delay(5)
      }
      break
    case 0xc9 /* RET */:
      r.wz.w = cpu.pop()
      r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xca /* JP Z, nn */:
      r.wz.w = cpu.fetchWord()
      if (r.f & FLAG_Z) r.pc.w = r.wz.w
      cpu.delay(10)
      break

    case 0xcc /* CALL Z, nn */:
      r.wz.w = cpu.fetchWord()
      if (r.f & FLAG_Z) {
        cpu.push(r.pc.w)
        r.pc.w = r.wz.w
        cpu.delay(17)
      } else {
        cpu.delay(10)
      }
      break
    case 0xcd /* CALL nn */:
      r.wz.w = cpu.fetchWord()
      cpu.push(r.pc.w)
      r.pc.w = r.wz.w
      cpu.delay(17)
      break
    case 0xce /* ADC A, n */:
      applyAlu8(r, adc8(r.a, cpu.fetchByte(), r.f))
      cpu.delay(7)
      break
    case 0xcf /* RST 08h */:
      cpu.push(r.pc.w)
      r.pc.w = 0x0008
      cpu.delay(11)
      break

    case 0xd0 /* RET NC */:
      if (!(r.f & FLAG_C)) {
        r.wz.w = cpu.pop()
        r.pc.w = r.wz.w
        cpu.delay(11)
      } else {
        cpu.delay(5)
      }
      break
    case 0xd1 /* POP DE */:
      r.de.w = cpu.pop()
      cpu.delay(10)
      break
    case 0xd2 /* JP NC, nn */:
      r.wz.w = cpu.fetchWord()
      if (!(r.f & FLAG_C)) r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xd3 /* OUT (n), A */: {
      r.wz.h = r.a
      r.wz.l = cpu.fetchByte()
      cpu.delay(11)
      cpu.output(r.wz.w, r.a)
      break
    }
    case 0xd4 /* CALL NC, nn */:
      r.wz.w = cpu.fetchWord()
      if (!(r.f & FLAG_C)) {
        cpu.push(r.pc.w)
        r.pc.w = r.wz.w
        cpu.delay(17)
      } else {
        cpu.delay(10)
      }
      break
    case 0xd5 /* PUSH DE */:
      cpu.push(r.de.w)
      cpu.delay(11)
      break
    case 0xd6 /* SUB n */:
      applyAlu8(r, sub8(r.a, cpu.fetchByte()))
      cpu.delay(7)
      break
    case 0xd7 /* RST 10h */:
      cpu.push(r.pc.w)
      r.pc.w = 0x0010
      cpu.delay(11)
      break

    case 0xd8 /* RET C */:
      if (r.f & FLAG_C) {
        r.wz.w = cpu.pop()
        r.pc.w = r.wz.w
        cpu.delay(11)
      } else {
        cpu.delay(5)
      }
      break
    case 0xd9 /* EXX */:
      swapWords(r.bc, r.bc2)
      swapWords(r.de, r.de2)
      swapWords(r.hl, r.hl2)
      swapWords(r.wz, r.wz2)
      cpu.delay(4)
      break
    case 0xda /* JP C, nn */:
      r.wz.w = cpu.fetchWord()
      if (r.f & FLAG_C) r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xdb /* IN A, (n) */: {
      r.wz.h = r.a
      r.wz.l = cpu.fetchByte()
      cpu.delay(11)
      r.a = cpu.input(r.wz.w)
      break
    }
    case 0xdc /* CALL C, nn */:
      r.wz.w = cpu.fetchWord()
      if (r.f & FLAG_C) {
        cpu.push(r.pc.w)
        r.pc.w = r.wz.w
        cpu.delay(17)
      } else {
        cpu.delay(10)
      }
      break

    case 0xde /* SBC A, n */:
      applyAlu8(r, sbc8(r.a, cpu.fetchByte(), r.f))
      cpu.delay(7)
      break
    case 0xdf /* RST 18h */:
      cpu.push(r.pc.w)
      r.pc.w = 0x0018
      cpu.delay(11)
      break

    case 0xe0 /* RET PO */:
      if (!(r.f & FLAG_P)) {
        r.wz.w = cpu.pop()
        r.pc.w = r.wz.w
        cpu.delay(11)
      } else {
        cpu.delay(5)
      }
      break
    case 0xe1 /* POP HL */:
      r.hl.w = cpu.pop()
      cpu.delay(10)
      break
    case 0xe2 /* JP PO, nn */:
      r.wz.w = cpu.fetchWord()
      if (!(r.f & FLAG_P)) r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xe3 /* EX (SP), HL */: {
      r.wz.w = cpu.readWord(r.sp.w)
      cpu.writeWord(r.sp.w, r.hl.w)
      r.hl.w = r.wz.w
      cpu.delay(19)
      break
    }
    case 0xe4 /* CALL PO, nn */:
      r.wz.w = cpu.fetchWord()
      if (!(r.f & FLAG_P)) {
        cpu.push(r.pc.w)
        r.pc.w = r.wz.w
        cpu.delay(17)
      } else {
        cpu.delay(10)
      }
      break
    case 0xe5 /* PUSH HL */:
      cpu.push(r.hl.w)
      cpu.delay(11)
      break
    case 0xe6 /* AND n */:
      applyAlu8(r, and8(r.a, cpu.fetchByte()))
      cpu.delay(7)
      break
    case 0xe7 /* RST 20h */:
      cpu.push(r.pc.w)
      r.pc.w = 0x0020
      cpu.delay(11)
      break

    case 0xe8 /* RET PE */:
      if (r.f & FLAG_P) {
        r.wz.w = cpu.pop()
        r.pc.w = r.wz.w
        cpu.delay(11)
      } else {
        cpu.delay(5)
      }
      break
    case 0xe9 /* JP (HL) */:
      r.pc.w = r.hl.w
      cpu.delay(4)
      break
    case 0xea /* JP PE, nn */:
      r.wz.w = cpu.fetchWord()
      if (r.f & FLAG_P) r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xeb /* EX DE, HL */:
      swapWords(r.de, r.hl)
      cpu.delay(4)
      break
    case 0xec /* CALL PE, nn */:
      r.wz.w = cpu.fetchWord()
      if (r.f & FLAG_P) {
        cpu.push(r.pc.w)
        r.pc.w = r.wz.w
        cpu.delay(17)
      } else {
        cpu.delay(10)
      }
      break

    case 0xee /* XOR n */:
      applyAlu8(r, xor8(r.a, cpu.fetchByte()))
      cpu.delay(7)
      break
    case 0xef /* RST 28h */:
      cpu.push(r.pc.w)
      r.pc.w = 0x0028
      cpu.delay(11)
      break

    case 0xf0 /* RET P */:
      if (!(r.f & FLAG_S)) {
        r.wz.w = cpu.pop()
        r.pc.w = r.wz.w
        cpu.delay(11)
      } else {
        cpu.delay(5)
      }
      break
    case 0xf1 /* POP AF */:
      r.af.w = cpu.pop()
      cpu.delay(10)
      break
    case 0xf2 /* JP P, nn */:
      r.wz.w = cpu.fetchWord()
      if (!(r.f & FLAG_S)) r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xf3 /* DI */:
      r.iff1 = 0
      r.iff2 = 0
      cpu.delay(4)
      break
    case 0xf4 /* CALL P, nn */:
      r.wz.w = cpu.fetchWord()
      if (!(r.f & FLAG_S)) {
        cpu.push(r.pc.w)
        r.pc.w = r.wz.w
        cpu.delay(17)
      } else {
        cpu.delay(10)
      }
      break
    case 0xf5 /* PUSH AF */:
      cpu.push(r.af.w)
      cpu.delay(11)
      break
    case 0xf6 /* OR n */:
      applyAlu8(r, or8(r.a, cpu.fetchByte()))
      cpu.delay(7)
      break
    case 0xf7 /* RST 30h */:
      cpu.push(r.pc.w)
      r.pc.w = 0x0030
      cpu.delay(11)
      break

    case 0xf8 /* RET M */:
      if (r.f & FLAG_S) {
        r.wz.w = cpu.pop()
        r.pc.w = r.wz.w
        cpu.delay(11)
      } else {
        cpu.delay(5)
      }
      break
    case 0xf9 /* LD SP, HL */:
      r.sp.w = r.hl.w
      cpu.delay(4)
      break
    case 0xfa /* JP M, nn */:
      r.wz.w = cpu.fetchWord()
      if (r.f & FLAG_S) r.pc.w = r.wz.w
      cpu.delay(10)
      break
    case 0xfb /* EI */:
      r.iff1 = 1
      r.iff2 = 1
      cpu.delay(4)
      break
    case 0xfc /* CALL M, nn */:
      r.wz.w = cpu.fetchWord()
      if (r.f & FLAG_S) {
        cpu.push(r.pc.w)
        r.pc.w = r.wz.w
        cpu.delay(17)
      } else {
        cpu.delay(10)
      }
      break

    case 0xfe /* CP n */:
      r.f = cp8(r.a, cpu.fetchByte()).flags
      cpu.delay(7)
      break
    case 0xff /* RST 38h */:
      cpu.push(r.pc.w)
      r.pc.w = 0x0038
      cpu.delay(11)
      break

    default:
      // 0xCB/0xDD/0xED/0xFD are intercepted by cpu.ts before reaching here.
      throw new Error(`executeBase: unreachable opcode 0x${op.toString(16).padStart(2, '0')}`)
  }
}

/** Sign-extends an 8-bit value read from memory, for relative jump offsets. */
function signed8(v: number): number {
  return (v << 24) >> 24
}

/** Applies an 8-bit ALU result (from add8/adc8/.../or8 in flags.ts) to A and F. */
function applyAlu8(r: { a: number; f: number }, res: { result: number; flags: number }): void {
  r.a = res.result
  r.f = res.flags
}
