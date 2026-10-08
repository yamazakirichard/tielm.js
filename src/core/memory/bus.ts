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
 * Byte-addressable 64KB Z80 memory bus interface, implemented by the CPU core's
 * `readByte`/`writeByte` calls. `FlatMemoryBus` is a simple RAM-backed
 * implementation used for opcode unit tests and the zexall/zexdoc harness
 * (tests/zexall), where there's no ROM paging to model. The real TI-85 memory
 * map (ROM/RAM bank switching per tilem/emu/x5/x5_memory.c and x5_io.c) is
 * implemented separately in calc/ti85.ts once port I/O (M4) is in place.
 */
export interface Bus {
  readByte(addr: number): number
  writeByte(addr: number, value: number): void
}

export class FlatMemoryBus implements Bus {
  private readonly mem = new Uint8Array(0x10000)

  readByte(addr: number): number {
    return this.mem[addr & 0xffff]
  }

  writeByte(addr: number, value: number): void {
    this.mem[addr & 0xffff] = value & 0xff
  }

  /** Test/harness convenience: load bytes directly into memory at an address. */
  loadBytes(addr: number, bytes: ArrayLike<number>): void {
    for (let i = 0; i < bytes.length; i++) {
      this.mem[(addr + i) & 0xffff] = bytes[i] & 0xff
    }
  }
}
