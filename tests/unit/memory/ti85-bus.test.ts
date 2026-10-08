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
import { Ti85MemoryBus } from '../../../src/core/memory/ti85-bus.ts'

describe('Ti85MemoryBus', () => {
  it('resets to window0/1=ROM page0, window2/3=RAM page 8', () => {
    const bus = new Ti85MemoryBus()
    expect([...bus.pageMap]).toEqual([0x00, 0x00, 0x08, 0x08])
  })

  it('reads ROM in window 0 (fixed to page 0) and window 1 (also page 0 by default)', () => {
    const bus = new Ti85MemoryBus()
    bus.rom[0x10] = 0xaa
    expect(bus.readByte(0x0010)).toBe(0xaa)
    expect(bus.readByte(0x4010)).toBe(0xaa) // window 1 defaults to ROM page 0 too, per x5_reset
  })

  it('reads/writes RAM in window 3 (fixed to RAM page 8)', () => {
    const bus = new Ti85MemoryBus()
    bus.writeByte(0xc010, 0x42)
    expect(bus.ram[0x10]).toBe(0x42)
    expect(bus.readByte(0xc010)).toBe(0x42)
  })

  it('silently ignores writes that land on ROM', () => {
    const bus = new Ti85MemoryBus()
    bus.rom[0x10] = 0x11
    bus.writeByte(0x0010, 0x99)
    expect(bus.rom[0x10]).toBe(0x11)
    expect(bus.readByte(0x0010)).toBe(0x11)
  })

  it('setPage remaps window 1/2 to a different physical page', () => {
    const bus = new Ti85MemoryBus()
    bus.rom[3 * 0x4000] = 0x33
    bus.setPage(1, 3)
    expect(bus.readByte(0x4000)).toBe(0x33)

    bus.setPage(2, 0x09) // RAM page 9
    bus.writeByte(0x8000, 0x55)
    expect(bus.ram[0x4000]).toBe(0x55) // page 9 -> ram offset (9-8)*0x4000
  })
})
