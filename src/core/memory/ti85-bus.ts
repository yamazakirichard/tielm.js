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

import type { Bus } from './bus.ts'

export const ROM_SIZE = 0x20000 // 128KB: 8 pages of 0x4000 (tilem/emu/x5/x5_subcore.c hardware_ti85.romsize)
export const RAM_SIZE = 0x8000 // 32KB: 2 pages of 0x4000, addressed as physical pages 0x08/0x09

/**
 * TI-85 paged Z80 memory bus. Ported from tilem/emu/x5/x5_memory.c.
 *
 * The Z80's 64KB address space is split into four fixed 16KB windows; each
 * window is mapped to one physical 16KB page via `pageMap`. Window 0
 * (0x0000-0x3FFF) is always ROM page 0, and window 3 (0xC000-0xFFFF) is
 * always RAM page 8 -- only windows 1 and 2 are software-switchable (via
 * port 5/6 writes, see io/ports.ts's setPage calls). Physical page numbers
 * 0-7 address ROM, 8-9 address RAM (`pa >= 0x20000` is the ROM/RAM split).
 */
export class Ti85MemoryBus implements Bus {
  readonly rom = new Uint8Array(ROM_SIZE)
  readonly ram = new Uint8Array(RAM_SIZE)
  /** Logical window (0-3) -> physical 16KB page number. */
  readonly pageMap = new Uint8Array(4)

  constructor() {
    this.reset()
  }

  /** Matches x5_init.c's x5_reset: window 0/1 -> ROM page 0, window 2/3 -> RAM page 8. */
  reset(): void {
    this.pageMap[0] = 0x00
    this.pageMap[1] = 0x00
    this.pageMap[2] = 0x08
    this.pageMap[3] = 0x08
  }

  setPage(window: 1 | 2, page: number): void {
    this.pageMap[window] = page & 0xff
  }

  readByte(addr: number): number {
    const pa = this.physicalAddress(addr)
    return pa >= 0x20000 ? this.ram[pa - 0x20000] : this.rom[pa]
  }

  writeByte(addr: number, value: number): void {
    const pa = this.physicalAddress(addr)
    // Matches x5_z80_wrmem: writes below the RAM boundary (i.e. into ROM) are silently dropped.
    if (pa >= 0x20000) this.ram[pa - 0x20000] = value & 0xff
  }

  private physicalAddress(addr: number): number {
    const page = this.pageMap[(addr >>> 14) & 3]
    return page * 0x4000 + (addr & 0x3fff)
  }
}
