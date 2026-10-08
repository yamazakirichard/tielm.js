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
import { Keypad } from '../../../src/core/devices/keypad.ts'
import { T6a43Lcd } from '../../../src/core/devices/lcd.ts'
import { INTERRUPT_ON_KEY, INTERRUPT_TIMER1, PORT3, PORT5, PORT6, Ti85Ports, type Ti85PortHost } from '../../../src/core/io/ports.ts'
import { Ti85MemoryBus } from '../../../src/core/memory/ti85-bus.ts'

function makeHost(): Ti85PortHost {
  return {
    bus: new Ti85MemoryBus(),
    lcd: new T6a43Lcd(),
    keypad: new Keypad(),
    hwregs: new Uint8Array(5),
    interrupts: 0,
    setInterrupts(mask: number) {
      this.interrupts = mask & 0xff
    },
  }
}

describe('Ti85Ports', () => {
  it('port 5/6 writes reprogram memory paging via setup_mapping', () => {
    const host = makeHost()
    const ports = new Ti85Ports(host)
    ports.output(5, 0x03) // ROM page 3 into window 1
    ports.output(6, 0x40) // RAM page 8 into window 2 (bit 0x40 set, low bit 0)
    expect([...host.bus.pageMap]).toEqual([0x00, 0x03, 0x08, 0x08])

    ports.output(6, 0x41) // RAM page 9 (bit0 set)
    expect(host.bus.pageMap[2]).toBe(0x09)
  })

  it('port 0/2/4 writes update the LCD device', () => {
    const host = makeHost()
    const ports = new Ti85Ports(host)
    ports.output(0, 0x20)
    expect(host.lcd.addr).toBe(0x2000)
    ports.output(2, 0x05)
    expect(host.lcd.contrast).toBe(21)
    ports.output(4, 0x10)
    expect(host.lcd.rowstride).toBe(16)
  })

  it('port 1 write/read round-trips through the keypad', () => {
    const host = makeHost()
    const ports = new Ti85Ports(host)
    host.keypad.keysDown[0] = 0x01
    ports.output(1, 0xfe) // select group 0
    expect(ports.input(1) & 0x01).toBe(0)
  })

  it('port 3 write clears pending interrupts when their enable bit is cleared', () => {
    const host = makeHost()
    host.interrupts = INTERRUPT_ON_KEY | INTERRUPT_TIMER1
    const ports = new Ti85Ports(host)
    ports.output(3, 0x00) // both bits 0
    expect(host.interrupts).toBe(0)
    expect(host.hwregs[PORT3]).toBe(0x00)
  })

  it('port 3 read reflects ON-key state and pending interrupts', () => {
    const host = makeHost()
    host.keypad.onKeyDown = true
    host.interrupts = INTERRUPT_TIMER1
    const ports = new Ti85Ports(host)
    const v = ports.input(3)
    expect(v & 0x08).toBe(0) // onKeyDown -> bit3 clear
    expect(v & 0x02).toBeTruthy() // TIMER1 pending -> bit1 set
  })

  it('port 5/6 reads return the raw stored register', () => {
    const host = makeHost()
    host.hwregs[PORT5] = 0x07
    host.hwregs[PORT6] = 0x41
    const ports = new Ti85Ports(host)
    expect(ports.input(5)).toBe(0x07)
    expect(ports.input(6)).toBe(0x41)
  })
})
