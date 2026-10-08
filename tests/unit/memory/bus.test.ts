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
import { FlatMemoryBus } from '../../../src/core/memory/bus.ts'

describe('FlatMemoryBus', () => {
  it('reads back what was written', () => {
    const bus = new FlatMemoryBus()
    bus.writeByte(0x1234, 0xab)
    expect(bus.readByte(0x1234)).toBe(0xab)
  })

  it('masks addresses to 16 bits and values to 8 bits', () => {
    const bus = new FlatMemoryBus()
    bus.writeByte(0x10000, 0x1ff) // wraps to addr 0, value 0xff
    expect(bus.readByte(0)).toBe(0xff)
  })

  it('loadBytes writes a contiguous block', () => {
    const bus = new FlatMemoryBus()
    bus.loadBytes(0x8000, [1, 2, 3])
    expect(bus.readByte(0x8000)).toBe(1)
    expect(bus.readByte(0x8001)).toBe(2)
    expect(bus.readByte(0x8002)).toBe(3)
  })
})
