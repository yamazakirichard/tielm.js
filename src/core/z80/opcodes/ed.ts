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
 * ED-prefixed (extended) Z80 opcode table, ported from tilem/emu/z80ed.h.
 * Undocumented duplicate encodings (e.g. 0x4C/0x54/... all being NEG) are
 * preserved since real software occasionally relies on them.
 */
import type { Z80 } from '../cpu.ts'
import { FLAG_Z, adc16, blockIoFlags, blockTransferFlags, cpiCpdFlags, ldAIR, neg, sbc16, szpFlags } from '../flags.ts'

export function executeEd(cpu: Z80, op: number): void {
  const r = cpu.r

  switch (op) {
    case 0x40 /* IN B, (C) */:
      r.wz.w = r.bc.w
      cpu.delay(12)
      r.bc.h = cpu.input(r.wz.w)
      r.f = szpFlags(r.bc.h, r.f)
      break
    case 0x41 /* OUT (C), B */:
      cpu.delay(12)
      cpu.output(r.bc.w, r.bc.h)
      break
    case 0x42 /* SBC HL, BC */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = sbc16(r.hl.w, r.bc.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(15)
      break
    }
    case 0x43 /* LD (nn), BC */:
      r.wz.w = cpu.fetchWord()
      cpu.writeWord(r.wz.w, r.bc.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(20)
      break
    case 0x44:
    case 0x4c:
    case 0x54:
    case 0x5c:
    case 0x64:
    case 0x6c:
    case 0x74:
    case 0x7c /* NEG */: {
      const res = neg(r.a)
      r.a = res.result
      r.f = res.flags
      cpu.delay(8)
      break
    }
    case 0x45:
    case 0x55:
    case 0x5d:
    case 0x65:
    case 0x6d:
    case 0x75:
    case 0x7d /* RETN */:
      r.iff1 = r.iff2
      r.pc.w = cpu.pop()
      cpu.delay(14)
      break
    case 0x46:
    case 0x4e:
    case 0x66:
    case 0x6e /* IM 0 */:
      r.im = 0
      cpu.delay(8)
      break
    case 0x47 /* LD I, A */:
      r.ir.h = r.a
      cpu.delay(9)
      break

    case 0x48 /* IN C, (C) */:
      r.wz.w = r.bc.w
      cpu.delay(12)
      r.bc.l = cpu.input(r.wz.w)
      r.f = szpFlags(r.bc.l, r.f)
      break
    case 0x49 /* OUT (C), C */:
      cpu.delay(12)
      cpu.output(r.bc.w, r.bc.l)
      break
    case 0x4a /* ADC HL, BC */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = adc16(r.hl.w, r.bc.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(15)
      break
    }
    case 0x4b /* LD BC, (nn) */:
      r.wz.w = cpu.fetchWord()
      r.bc.w = cpu.readWord(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(20)
      break
    case 0x4d /* RETI */:
      r.iff1 = r.iff2
      r.pc.w = cpu.pop()
      cpu.delay(14)
      break
    case 0x4f /* LD R, A */:
      r.r = r.a
      cpu.delay(9)
      break

    case 0x50 /* IN D, (C) */:
      r.wz.w = r.bc.w
      cpu.delay(12)
      r.de.h = cpu.input(r.wz.w)
      r.f = szpFlags(r.de.h, r.f)
      break
    case 0x51 /* OUT (C), D */:
      cpu.delay(12)
      cpu.output(r.bc.w, r.de.h)
      break
    case 0x52 /* SBC HL, DE */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = sbc16(r.hl.w, r.de.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(15)
      break
    }
    case 0x53 /* LD (nn), DE */:
      r.wz.w = cpu.fetchWord()
      cpu.writeWord(r.wz.w, r.de.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(20)
      break
    case 0x56:
    case 0x76 /* IM 1 */:
      r.im = 1
      cpu.delay(8)
      break
    case 0x57 /* LD A, I */: {
      const res = ldAIR(r.ir.h, r.iff2, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(9)
      break
    }

    case 0x58 /* IN E, (C) */:
      r.wz.w = r.bc.w
      cpu.delay(12)
      r.de.l = cpu.input(r.wz.w)
      r.f = szpFlags(r.de.l, r.f)
      break
    case 0x59 /* OUT (C), E */:
      cpu.delay(12)
      cpu.output(r.bc.w, r.de.l)
      break
    case 0x5a /* ADC HL, DE */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = adc16(r.hl.w, r.de.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(15)
      break
    }
    case 0x5b /* LD DE, (nn) */:
      r.wz.w = cpu.fetchWord()
      r.de.w = cpu.readWord(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(20)
      break
    case 0x5e:
    case 0x7e /* IM 2 */:
      r.im = 2
      cpu.delay(8)
      break
    case 0x5f /* LD A, R */: {
      const res = ldAIR(r.r, r.iff2, r.f)
      r.a = res.result
      r.f = res.flags
      cpu.delay(9)
      break
    }

    case 0x60 /* IN H, (C) */:
      r.wz.w = r.bc.w
      cpu.delay(12)
      r.hl.h = cpu.input(r.wz.w)
      r.f = szpFlags(r.hl.h, r.f)
      break
    case 0x61 /* OUT (C), H */:
      cpu.delay(12)
      cpu.output(r.bc.w, r.hl.h)
      break
    case 0x62 /* SBC HL, HL */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = sbc16(r.hl.w, r.hl.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(15)
      break
    }
    case 0x63 /* LD (nn), HL */:
      r.wz.w = cpu.fetchWord()
      cpu.writeWord(r.wz.w, r.hl.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(20)
      break
    case 0x67 /* RRD */: {
      const arg1 = cpu.readByte(r.hl.w)
      const arg2 = r.a
      const res = (arg2 & 0xf0) | (arg1 & 0x0f)
      r.wz.w = (r.hl.w + 1) & 0xffff
      cpu.writeByte(r.hl.w, (arg1 >> 4) | (arg2 << 4))
      r.f = szpFlags(res, r.f)
      r.a = res
      cpu.delay(18)
      break
    }

    case 0x68 /* IN L, (C) */:
      r.wz.w = r.bc.w
      cpu.delay(12)
      r.hl.l = cpu.input(r.wz.w)
      r.f = szpFlags(r.hl.l, r.f)
      break
    case 0x69 /* OUT (C), L */:
      cpu.delay(12)
      cpu.output(r.bc.w, r.hl.l)
      break
    case 0x6a /* ADC HL, HL */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = adc16(r.hl.w, r.hl.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(15)
      break
    }
    case 0x6b /* LD HL, (nn) */:
      r.wz.w = cpu.fetchWord()
      r.hl.w = cpu.readWord(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(20)
      break
    case 0x6f /* RLD */: {
      const arg1 = cpu.readByte(r.hl.w)
      const arg2 = r.a
      const res = (arg2 & 0xf0) | (arg1 >> 4)
      r.wz.w = (r.hl.w + 1) & 0xffff
      cpu.writeByte(r.hl.w, (arg1 << 4) | (arg2 & 0xf))
      r.f = szpFlags(res, r.f)
      r.a = res
      cpu.delay(18)
      break
    }

    case 0x70 /* IN (C) (undocumented, flags only) */:
      r.wz.w = r.bc.w
      cpu.delay(12)
      r.f = szpFlags(cpu.input(r.wz.w), r.f)
      break
    case 0x71 /* OUT (C), 0 (undocumented) */:
      cpu.delay(12)
      cpu.output(r.bc.w, 0)
      break
    case 0x72 /* SBC HL, SP */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = sbc16(r.hl.w, r.sp.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(15)
      break
    }
    case 0x73 /* LD (nn), SP */:
      r.wz.w = cpu.fetchWord()
      cpu.writeWord(r.wz.w, r.sp.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(20)
      break

    case 0x78 /* IN A, (C) */:
      r.wz.w = r.bc.w
      cpu.delay(12)
      r.a = cpu.input(r.wz.w)
      r.f = szpFlags(r.a, r.f)
      break
    case 0x79 /* OUT (C), A */:
      cpu.delay(12)
      cpu.output(r.bc.w, r.a)
      break
    case 0x7a /* ADC HL, SP */: {
      r.wz.w = (r.hl.w + 1) & 0xffff
      const res = adc16(r.hl.w, r.sp.w, r.f)
      r.hl.w = res.result
      r.f = res.flags
      cpu.delay(15)
      break
    }
    case 0x7b /* LD SP, (nn) */:
      r.wz.w = cpu.fetchWord()
      r.sp.w = cpu.readWord(r.wz.w)
      r.wz.w = (r.wz.w + 1) & 0xffff
      cpu.delay(20)
      break

    case 0xa0 /* LDI */:
      doLdi(cpu, 1)
      cpu.delay(16)
      break
    case 0xa1 /* CPI */:
      doCpi(cpu, 1)
      cpu.delay(16)
      break
    case 0xa2 /* INI */:
      cpu.delay(13)
      doIni(cpu, 1)
      cpu.delay(3)
      break
    case 0xa3 /* OUTI */:
      cpu.delay(16)
      doOuti(cpu, 1)
      break

    case 0xa8 /* LDD */:
      doLdi(cpu, -1)
      cpu.delay(16)
      break
    case 0xa9 /* CPD */:
      doCpi(cpu, -1)
      cpu.delay(16)
      break
    case 0xaa /* IND */:
      cpu.delay(13)
      doIni(cpu, -1)
      cpu.delay(3)
      break
    case 0xab /* OUTD */:
      cpu.delay(16)
      doOuti(cpu, -1)
      break

    case 0xb0 /* LDIR */:
      doLdi(cpu, 1)
      if (r.bc.w) {
        r.pc.w = (r.pc.w - 2) & 0xffff
        cpu.delay(21)
      } else {
        cpu.delay(16)
      }
      break
    case 0xb1 /* CPIR */:
      doCpi(cpu, 1)
      if (r.bc.w && !(r.f & FLAG_Z)) {
        r.pc.w = (r.pc.w - 2) & 0xffff
        cpu.delay(21)
      } else {
        cpu.delay(16)
      }
      break
    case 0xb2 /* INIR */:
      cpu.delay(13)
      doIni(cpu, 1)
      if (r.bc.h) {
        r.pc.w = (r.pc.w - 2) & 0xffff
        cpu.delay(8)
      } else {
        cpu.delay(3)
      }
      break
    case 0xb3 /* OTIR */:
      cpu.delay(16)
      doOuti(cpu, 1)
      if (r.bc.h) {
        r.pc.w = (r.pc.w - 2) & 0xffff
        cpu.delay(5)
      }
      break

    case 0xb8 /* LDDR */:
      doLdi(cpu, -1)
      if (r.bc.w) {
        r.pc.w = (r.pc.w - 2) & 0xffff
        cpu.delay(21)
      } else {
        cpu.delay(16)
      }
      break
    case 0xb9 /* CPDR */:
      doCpi(cpu, -1)
      if (r.bc.w && !(r.f & FLAG_Z)) {
        r.pc.w = (r.pc.w - 2) & 0xffff
        cpu.delay(21)
      } else {
        cpu.delay(16)
      }
      break
    case 0xba /* INDR */:
      cpu.delay(13)
      doIni(cpu, -1)
      if (r.bc.h) {
        r.pc.w = (r.pc.w - 2) & 0xffff
        cpu.delay(8)
      } else {
        cpu.delay(3)
      }
      break
    case 0xbb /* OTDR */:
      cpu.delay(16)
      doOuti(cpu, -1)
      if (r.bc.h) {
        r.pc.w = (r.pc.w - 2) & 0xffff
        cpu.delay(5)
      }
      break

    default:
      // Undefined ED opcodes behave as an 8-cycle NOP on real hardware.
      cpu.delay(8)
      break
  }
}

/** LDI (dir=1) / LDD (dir=-1): (DE)<-(HL); HL+=dir; DE+=dir; BC--. */
function doLdi(cpu: Z80, dir: 1 | -1): void {
  const r = cpu.r
  const value = cpu.readByte(r.hl.w)
  cpu.writeByte(r.de.w, value)
  r.hl.w = (r.hl.w + dir) & 0xffff
  r.de.w = (r.de.w + dir) & 0xffff
  r.bc.w = (r.bc.w - 1) & 0xffff
  r.f = blockTransferFlags(value, r.bc.w, r.f)
}

/** CPI (dir=1) / CPD (dir=-1): compare A with (HL); HL+=dir; BC--. */
function doCpi(cpu: Z80, dir: 1 | -1): void {
  const r = cpu.r
  const value = cpu.readByte(r.hl.w)
  r.hl.w = (r.hl.w + dir) & 0xffff
  r.bc.w = (r.bc.w - 1) & 0xffff
  r.f = cpiCpdFlags(r.a, value, r.bc.w, r.f)
}

/** INI (dir=1) / IND (dir=-1): (HL)<-in(BC); HL+=dir; B--. */
function doIni(cpu: Z80, dir: 1 | -1): void {
  const r = cpu.r
  const value = cpu.input(r.bc.w)
  cpu.writeByte(r.hl.w, value)
  r.hl.w = (r.hl.w + dir) & 0xffff
  r.wz.w = (r.bc.w + dir) & 0xffff
  const k = r.wz.l + value
  r.bc.h = (r.bc.h - 1) & 0xff
  r.f = blockIoFlags(value, k, r.bc.h)
}

/** OUTI (dir=1) / OUTD (dir=-1): out(BC)<-(HL); HL+=dir; B--. */
function doOuti(cpu: Z80, dir: 1 | -1): void {
  const r = cpu.r
  const value = cpu.readByte(r.hl.w)
  r.hl.w = (r.hl.w + dir) & 0xffff
  r.bc.h = (r.bc.h - 1) & 0xff
  cpu.output(r.bc.w, value)
  const k = r.hl.l + value
  r.wz.w = (r.bc.w + 1) & 0xffff
  r.f = blockIoFlags(value, k, r.bc.h)
}

