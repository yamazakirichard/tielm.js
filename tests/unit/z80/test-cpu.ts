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

import { FlatMemoryBus } from '../../../src/core/memory/bus.ts'
import { Z80, type PortIO } from '../../../src/core/z80/cpu.ts'

/** No-op port bus for opcode tests that don't exercise IN/OUT. */
export class StubPorts implements PortIO {
  lastOut: { port: number; value: number } | null = null
  inputValue = 0

  input(port: number): number {
    void port
    return this.inputValue
  }

  output(port: number, value: number): void {
    this.lastOut = { port, value }
  }
}

/** Builds a Z80 wired to a flat 64KB RAM bus, for isolated opcode tests. */
export function makeTestCpu(): { cpu: Z80; bus: FlatMemoryBus; ports: StubPorts } {
  const bus = new FlatMemoryBus()
  const ports = new StubPorts()
  const cpu = new Z80(bus, ports)
  cpu.reset()
  return { cpu, bus, ports }
}

/** Loads bytes at PC (default 0) and executes exactly one instruction. */
export function runOne(cpu: Z80, bus: FlatMemoryBus, bytes: number[], atPc = 0): number {
  cpu.r.pc.w = atPc
  bus.loadBytes(atPc, bytes)
  return cpu.step()
}
