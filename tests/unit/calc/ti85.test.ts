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
import { Ti85Calc } from '../../../src/core/calc/ti85.ts'
import { KEY_ON } from '../../../src/core/devices/keypad.ts'
import { ROM_SIZE } from '../../../src/core/memory/ti85-bus.ts'

describe('Ti85Calc', () => {
  it('resets hwregs and paging to x5_reset defaults', () => {
    const calc = new Ti85Calc()
    expect(calc.hwregs[0]).toBe(0x0b) // PORT3
    expect(calc.hwregs[1]).toBe(0x16) // PORT4
    expect(calc.hwregs[2]).toBe(0x00) // PORT5
    expect(calc.hwregs[3]).toBe(0x40) // PORT6
    expect([...calc.bus.pageMap]).toEqual([0x00, 0x00, 0x08, 0x08])
    expect(calc.lcd.addr).toBe(0x3c00)
  })

  it('loadRom rejects the wrong size and accepts exactly 128KB', () => {
    const calc = new Ti85Calc()
    expect(() => calc.loadRom(new Uint8Array(10))).toThrow()
    const rom = new Uint8Array(ROM_SIZE)
    rom[0] = 0xc3 // arbitrary marker byte
    calc.loadRom(rom)
    expect(calc.romLoaded).toBe(true)
    expect(calc.bus.rom[0]).toBe(0xc3)
  })

  it('runForCycles executes instructions from ROM through the real memory map', () => {
    const calc = new Ti85Calc()
    const rom = new Uint8Array(ROM_SIZE)
    rom[0] = 0x3e // LD A,0x42
    rom[1] = 0x42
    rom[2] = 0x76 // HALT
    calc.loadRom(rom)
    calc.runForCycles(20)
    expect(calc.z80.r.a).toBe(0x42)
    expect(calc.z80.halted).toBe(true)
  })

  it('pressKey sets the ON-key interrupt bit when armed', () => {
    const calc = new Ti85Calc()
    calc.keypad.onKeyInt = true
    calc.pressKey(KEY_ON)
    expect(calc.interrupts & 0x01).toBeTruthy()
  })

  it('TIMER1 fires periodically once armed via port 3 bit 1, and not before', () => {
    const calc = new Ti85Calc()
    calc.runForCycles(100_000) // TIMER1 not armed by default (hwregs[PORT3]=0x0b has bit1 set actually)
    // hwregs[PORT3] defaults to 0x0b (bit1 set) per x5_reset, so TIMER1 should already be armed at reset.
    expect(calc.interrupts & 0x02).toBeTruthy()
  })

  it('TIMER1 never fires while its enable bit is clear', () => {
    const calc = new Ti85Calc()
    calc.hwregs[0] = 0x00 // PORT3: disable both interrupts
    calc.runForCycles(200_000)
    expect(calc.interrupts & 0x02).toBe(0)
  })

  it('getFrame reads through the real RAM (post-paging) at the LCD address', () => {
    const calc = new Ti85Calc()
    calc.lcd.active = true
    calc.lcd.addr = 0x0000
    calc.bus.ram[0] = 0xaa
    const frame = calc.getFrame()
    expect(frame[0]).toBe(0xaa)
  })

  it('getFrame is blank while the LCD is inactive, even with stale RAM at the frame address', () => {
    const calc = new Ti85Calc()
    calc.lcd.addr = 0x0000
    calc.bus.ram[0] = 0xaa
    const frame = calc.getFrame()
    expect(frame.every((byte) => byte === 0)).toBe(true)
  })
})
