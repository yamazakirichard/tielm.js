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

/** A 16-bit register pair addressable as two 8-bit halves, e.g. AF/BC/DE/HL. */
export class RegPair {
  h = 0
  l = 0

  get w(): number {
    return ((this.h << 8) | this.l) & 0xffff
  }

  set w(v: number) {
    this.h = (v >> 8) & 0xff
    this.l = v & 0xff
  }
}

/** Full Z80 register file, including the shadow set and the TilEm-style WZ/MEMPTR pair. */
export class Z80Registers {
  af = new RegPair()
  bc = new RegPair()
  de = new RegPair()
  hl = new RegPair()
  ix = new RegPair()
  iy = new RegPair()
  sp = new RegPair()
  pc = new RegPair()
  /** I in ir.h, R (low 7 bits) in ir.l */
  ir = new RegPair()
  /** MEMPTR / WZ, used by some undocumented flag behavior */
  wz = new RegPair()

  af2 = new RegPair()
  bc2 = new RegPair()
  de2 = new RegPair()
  hl2 = new RegPair()
  /** Shadow MEMPTR, swapped in by EXX */
  wz2 = new RegPair()

  iff1 = 0
  iff2 = 0
  im = 0
  /** Bit 7 of the R register, preserved separately across INC R wraparound (z80.h Rh/Rl/R) */
  r7 = 0

  get a(): number {
    return this.af.h
  }
  set a(v: number) {
    this.af.h = v & 0xff
  }

  get f(): number {
    return this.af.l
  }
  set f(v: number) {
    this.af.l = v & 0xff
  }

  /** Combined R register: low 7 bits of ir.l plus the separately-tracked bit 7. */
  get r(): number {
    return (this.ir.l & 0x7f) | this.r7
  }

  set r(v: number) {
    this.ir.l = v & 0x7f
    this.r7 = v & 0x80
  }

  /** Increments the refresh register's low 7 bits, wrapping without touching bit 7. */
  incR(): void {
    this.ir.l = (this.ir.l + 1) & 0x7f
  }
}
