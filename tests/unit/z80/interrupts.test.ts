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
import { makeTestCpu, runOne } from './test-cpu.ts'

describe('HALT and interrupt handling', () => {
  it('HALT re-fetches itself (PC does not advance) while no interrupt is pending', () => {
    const { cpu, bus } = makeTestCpu()
    runOne(cpu, bus, [0x76]) // HALT
    expect(cpu.halted).toBe(true)
    const pc = cpu.r.pc.w
    cpu.step()
    cpu.step()
    expect(cpu.r.pc.w).toBe(pc)
    expect(cpu.halted).toBe(true)
  })

  it('a pending interrupt wakes the CPU from HALT and services IM 1', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.sp.w = 0xfffe
    cpu.r.im = 1
    cpu.r.iff1 = 1
    runOne(cpu, bus, [0x76]) // HALT
    expect(cpu.halted).toBe(true)
    const haltPc = cpu.r.pc.w

    cpu.requestInterrupt()
    cpu.step()

    expect(cpu.halted).toBe(false)
    expect(cpu.r.pc.w).toBe(0x0038)
    expect(cpu.r.iff1).toBe(0)
    // Return address pushed is the instruction *after* HALT, not HALT's own
    // address -- confirmed against tilem/emu/z80.c's actual PC arithmetic
    // (PC++ happens unconditionally on the phantom fetch; PC-- to re-arm the
    // HALT opcode only happens in the *other* branch, when no interrupt is
    // accepted that cycle). Real hardware works the same way: waking from
    // HALT resumes execution after it, it never re-executes HALT once woken.
    expect(cpu.readWord(cpu.r.sp.w)).toBe((haltPc + 1) & 0xffff)
  })

  it('IM 1 interrupt acceptance pushes PC and jumps to 0x0038 when not halted', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.sp.w = 0xfffe
    cpu.r.im = 1
    cpu.r.iff1 = 1
    cpu.r.pc.w = 0x1000
    bus.loadBytes(0x1000, [0x00]) // NOP
    cpu.requestInterrupt()
    cpu.step()
    expect(cpu.r.pc.w).toBe(0x0038)
    expect(cpu.readWord(cpu.r.sp.w)).toBe(0x1001)
  })

  it('DI clears IFF1/IFF2 so a pending interrupt is not accepted', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.im = 1
    runOne(cpu, bus, [0xf3]) // DI
    expect(cpu.r.iff1).toBe(0)
    cpu.requestInterrupt()
    bus.loadBytes(cpu.r.pc.w, [0x00]) // NOP
    cpu.step()
    expect(cpu.r.pc.w).toBe(2) // advanced normally past the NOP, not diverted to 0x0038
  })

  it('EI suppresses interrupt acceptance for the instruction immediately after it', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.im = 1
    cpu.r.pc.w = 0
    bus.loadBytes(0, [0xfb, 0x00, 0x00]) // EI, NOP, NOP
    cpu.requestInterrupt()
    cpu.step() // EI: interrupt must NOT be accepted here even though IFF1 is now 1
    expect(cpu.r.pc.w).toBe(1)
    cpu.step() // the instruction right after EI: now the interrupt is accepted
    expect(cpu.r.pc.w).toBe(0x0038)
  })
})
