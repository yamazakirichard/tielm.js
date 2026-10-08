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
 * T6A43 LCD controller state for the TI-85. Ported from tilem/emu/lcd.c's
 * tilem_lcd_t6a43_get_data plus the port 0/2/4 handling in x5_io.c. Unlike
 * the T6A04 used by other models, the T6A43 has no command protocol -- it's
 * driven entirely by writing to RAM at `addr` and setting `rowstride`/
 * `contrast` via ports 0/2/4. Grayscale simulation (tilem's graylcd.c) is
 * out of scope for v1 -- getFrameData() returns a plain 1bpp frame.
 */
export const LCD_WIDTH = 128
export const LCD_HEIGHT = 64
const WIDTH_BYTES = LCD_WIDTH / 8 // 16 bytes/row

export class T6a43Lcd {
  /** Offset into RAM where the visible frame buffer starts (port 0, high 6 bits << 8). */
  addr = 0x3c00
  /** 16-37 range in practice (16 + low 5 bits of port 2's value). Resets to 32, tilem_lcd_reset's generic default -- x5_reset never writes port 2. */
  contrast = 32
  /** Bytes between rows in RAM: 10, 12, 16, or 20, selected by port 4 bits 3-4. Resets to 16 (128/8), tilem_lcd_reset's generic fallback for a RAM-mapped screen with no dedicated lcdmem -- coincidentally also what PORT4's x5_reset value of 0x16 decodes to. */
  rowstride = 16
  /** LCD power state, set by port 3 bit 3. */
  active = false

  reset(): void {
    this.addr = 0x3c00
    this.contrast = 32
    this.rowstride = 16
    this.active = false
  }

  setAddrFromPort0(value: number): void {
    this.addr = (value & 0x3f) << 8
  }

  setContrastFromPort2(value: number): void {
    this.contrast = 16 + (value & 0x1f)
  }

  /** Port 4's low bits (0x18 mask) select the row stride; matches x5_io.c's switch table. */
  setRowstrideFromPort4(value: number): void {
    switch (value & 0x18) {
      case 0x00:
        this.rowstride = 10
        break
      case 0x08:
        this.rowstride = 12
        break
      case 0x10:
        this.rowstride = 16
        break
      case 0x18:
        this.rowstride = 20
        break
    }
  }

  /**
   * Extracts the visible 128x64 1bpp frame (16 bytes/row) from RAM.
   * Ported verbatim from tilem_lcd_t6a43_get_data's three-segment-per-row
   * copy: the first 10 bytes come straight from memory, any bytes beyond
   * that up to `rowstride` are zero-filled, and any remaining bytes (when
   * `rowstride` > 16, e.g. graphics-heavy modes) wrap around and re-read
   * from later in the same row -- a real T6A43 hardware quirk, not a bug.
   */
  getFrameData(ram: Uint8Array): Uint8Array {
    const data = new Uint8Array(WIDTH_BYTES * LCD_HEIGHT)
    let rowStart = this.addr
    let out = 0

    for (let i = 0; i < LCD_HEIGHT; i++) {
      let j = 0
      for (; j < 10; j++) data[out + j] = ram[(rowStart + j) & 0x7fff]
      for (; j < 10 + WIDTH_BYTES - this.rowstride; j++) data[out + j] = 0
      for (; j < WIDTH_BYTES; j++) data[out + j] = ram[(rowStart + j + this.rowstride - WIDTH_BYTES) & 0x7fff]

      out += WIDTH_BYTES
      rowStart += this.rowstride
    }

    return data
  }
}
