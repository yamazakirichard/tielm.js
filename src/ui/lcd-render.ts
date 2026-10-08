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
 * Pure, core-independent conversion from the TI-85's packed 1bpp LCD frame
 * (as returned by T6a43Lcd.getFrameData -- 16 bytes/row x 64 rows, MSB-first
 * within each byte) into RGBA pixel data ready for a canvas ImageData.
 */
export const DEFAULT_ON_COLOR: readonly [number, number, number, number] = [30, 39, 26, 255]
export const DEFAULT_OFF_COLOR: readonly [number, number, number, number] = [156, 173, 118, 255]

export function unpackFrame(
  bits: Uint8Array,
  width: number,
  height: number,
  onColor: readonly [number, number, number, number] = DEFAULT_ON_COLOR,
  offColor: readonly [number, number, number, number] = DEFAULT_OFF_COLOR,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(width * height * 4))
  const bytesPerRow = width / 8

  for (let y = 0; y < height; y++) {
    for (let byteX = 0; byteX < bytesPerRow; byteX++) {
      const b = bits[y * bytesPerRow + byteX]
      for (let bit = 0; bit < 8; bit++) {
        const on = (b >> (7 - bit)) & 1
        const color = on ? onColor : offColor
        const idx = (y * width + byteX * 8 + bit) * 4
        out[idx] = color[0]
        out[idx + 1] = color[1]
        out[idx + 2] = color[2]
        out[idx + 3] = color[3]
      }
    }
  }

  return out
}
