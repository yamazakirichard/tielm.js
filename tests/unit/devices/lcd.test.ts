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

import { describe, expect, it } from 'vitest'
import { T6a43Lcd } from '../../../src/core/devices/lcd.ts'

describe('T6a43Lcd', () => {
  it('setAddrFromPort0 uses the high 6 bits shifted into a RAM offset', () => {
    const lcd = new T6a43Lcd()
    lcd.setAddrFromPort0(0x3c) // matches the reset default's high byte
    expect(lcd.addr).toBe(0x3c00)
  })

  it('setContrastFromPort2 maps the low 5 bits into 16-47', () => {
    const lcd = new T6a43Lcd()
    lcd.setContrastFromPort2(0x1f)
    expect(lcd.contrast).toBe(16 + 0x1f)
  })

  it('setRowstrideFromPort4 selects 10/12/16/20 from bits 3-4', () => {
    const lcd = new T6a43Lcd()
    lcd.setRowstrideFromPort4(0x00)
    expect(lcd.rowstride).toBe(10)
    lcd.setRowstrideFromPort4(0x08)
    expect(lcd.rowstride).toBe(12)
    lcd.setRowstrideFromPort4(0x10)
    expect(lcd.rowstride).toBe(16)
    lcd.setRowstrideFromPort4(0x18)
    expect(lcd.rowstride).toBe(20)
  })

  it('getFrameData with the default rowstride (10) zero-fills bytes 10-15 of every row', () => {
    const lcd = new T6a43Lcd()
    lcd.addr = 0x1000
    lcd.rowstride = 10
    const ram = new Uint8Array(0x8000)
    for (let row = 0; row < 3; row++) {
      for (let b = 0; b < 10; b++) ram[0x1000 + row * 10 + b] = 0x10 + row * 10 + b
    }
    const frame = lcd.getFrameData(ram)
    // Row 0: bytes 0-9 from RAM, bytes 10-15 zero.
    for (let b = 0; b < 10; b++) expect(frame[b]).toBe(0x10 + b)
    for (let b = 10; b < 16; b++) expect(frame[b]).toBe(0)
    // Row 1 starts at frame offset 16 (width bytes), RAM offset addr+10.
    expect(frame[16]).toBe(0x1a)
  })

  it('getFrameData with rowstride 20 (> width) wraps into later row bytes instead of zero-filling', () => {
    const lcd = new T6a43Lcd()
    lcd.addr = 0x2000
    lcd.rowstride = 20
    const ram = new Uint8Array(0x8000)
    for (let b = 0; b < 20; b++) ram[0x2000 + b] = b
    const frame = lcd.getFrameData(ram)
    for (let b = 0; b < 10; b++) expect(frame[b]).toBe(b)
    // bytes 10-15 come from ram[b + stride - width] = ram[b + 4]
    for (let b = 10; b < 16; b++) expect(frame[b]).toBe(b + 4)
  })
})
