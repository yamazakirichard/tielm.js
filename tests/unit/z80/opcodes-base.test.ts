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
import { FLAG_C, FLAG_N, FLAG_Z } from '../../../src/core/z80/flags.ts'
import { makeTestCpu, runOne } from './test-cpu.ts'

describe('base opcodes: load/arithmetic/control flow', () => {
  it('NOP takes 4 cycles and does not move any data', () => {
    const { cpu, bus } = makeTestCpu()
    const cycles = runOne(cpu, bus, [0x00])
    expect(cycles).toBe(4)
    expect(cpu.r.pc.w).toBe(1)
  })

  it('LD BC,nn loads a 16-bit immediate', () => {
    const { cpu, bus } = makeTestCpu()
    runOne(cpu, bus, [0x01, 0x34, 0x12]) // LD BC, 0x1234
    expect(cpu.r.bc.w).toBe(0x1234)
    expect(cpu.r.pc.w).toBe(3)
  })

  it('LD (BC),A / LD A,(BC) round-trip through memory', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.a = 0x42
    cpu.r.bc.w = 0x8000
    runOne(cpu, bus, [0x02]) // LD (BC),A
    expect(bus.readByte(0x8000)).toBe(0x42)

    cpu.r.a = 0
    runOne(cpu, bus, [0x0a], 1) // LD A,(BC), placed right after the first instr
    expect(cpu.r.a).toBe(0x42)
  })

  it('INC B / DEC B update flags via the shared flags helpers', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.bc.h = 0xff
    runOne(cpu, bus, [0x04]) // INC B
    expect(cpu.r.bc.h).toBe(0x00)
    expect(cpu.r.f & FLAG_Z).toBeTruthy()

    cpu.r.bc.h = 0x01
    runOne(cpu, bus, [0x05], 1) // DEC B
    expect(cpu.r.bc.h).toBe(0x00)
    expect(cpu.r.f & FLAG_Z).toBeTruthy()
    expect(cpu.r.f & FLAG_N).toBeTruthy()
  })

  it('ADD A,r sets carry on overflow', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.a = 0xff
    cpu.r.bc.h = 0x01
    runOne(cpu, bus, [0x80]) // ADD A,B
    expect(cpu.r.a).toBe(0x00)
    expect(cpu.r.f & FLAG_C).toBeTruthy()
    expect(cpu.r.f & FLAG_Z).toBeTruthy()
  })

  it('CP A,n sets flags without modifying A', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.a = 0x10
    runOne(cpu, bus, [0xfe, 0x10]) // CP 0x10
    expect(cpu.r.a).toBe(0x10)
    expect(cpu.r.f & FLAG_Z).toBeTruthy()
  })

  it('LD r,(HL) and LD (HL),r read/write through HL', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.hl.w = 0x9000
    bus.writeByte(0x9000, 0x77)
    runOne(cpu, bus, [0x46]) // LD B,(HL)
    expect(cpu.r.bc.h).toBe(0x77)

    cpu.r.bc.l = 0x55
    runOne(cpu, bus, [0x71], 1) // LD (HL),C
    expect(bus.readByte(0x9000)).toBe(0x55)
  })

  it('HALT sets the halted flag and re-fetches without advancing PC', () => {
    const { cpu, bus } = makeTestCpu()
    runOne(cpu, bus, [0x76])
    expect(cpu.halted).toBe(true)
    const pcAfterHalt = cpu.r.pc.w
    const cycles = cpu.step()
    expect(cycles).toBe(4)
    expect(cpu.r.pc.w).toBe(pcAfterHalt) // halted step doesn't fetch/advance
  })

  it('JR $+n adjusts PC by a signed offset', () => {
    const { cpu, bus } = makeTestCpu()
    runOne(cpu, bus, [0x18, 0xfe]) // JR -2 -> back to the JR itself
    expect(cpu.r.pc.w).toBe(0)
  })

  it('DJNZ loops while B is nonzero', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.bc.h = 2
    const cycles = runOne(cpu, bus, [0x10, 0xfe]) // DJNZ -2 (back to itself)
    expect(cpu.r.bc.h).toBe(1)
    expect(cpu.r.pc.w).toBe(0)
    expect(cycles).toBe(13)
  })

  it('CALL nn / RET round-trip through the stack', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.sp.w = 0xfffe
    cpu.r.pc.w = 0x0100
    bus.loadBytes(0x0100, [0xcd, 0x00, 0x02]) // CALL 0x0200
    bus.loadBytes(0x0200, [0xc9]) // RET
    cpu.step() // CALL
    expect(cpu.r.pc.w).toBe(0x0200)
    expect(cpu.r.sp.w).toBe(0xfffc)
    cpu.step() // RET
    expect(cpu.r.pc.w).toBe(0x0103)
    expect(cpu.r.sp.w).toBe(0xfffe)
  })

  it('PUSH/POP round-trip a register pair', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.sp.w = 0xfffe
    cpu.r.de.w = 0xbeef
    runOne(cpu, bus, [0xd5]) // PUSH DE
    cpu.r.de.w = 0
    runOne(cpu, bus, [0xe1], 1) // POP HL (pop into HL to prove the stack held the value)
    expect(cpu.r.hl.w).toBe(0xbeef)
  })

  it('EX DE,HL and EXX swap register pairs', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.de.w = 0x1111
    cpu.r.hl.w = 0x2222
    runOne(cpu, bus, [0xeb]) // EX DE,HL
    expect(cpu.r.de.w).toBe(0x2222)
    expect(cpu.r.hl.w).toBe(0x1111)

    cpu.r.bc.w = 0xaaaa
    cpu.r.bc2.w = 0xbbbb
    runOne(cpu, bus, [0xd9], 1) // EXX
    expect(cpu.r.bc.w).toBe(0xbbbb)
    expect(cpu.r.bc2.w).toBe(0xaaaa)
  })

  it('OUT (n),A and IN A,(n) go through the port bus', () => {
    const { cpu, bus, ports } = makeTestCpu()
    cpu.r.a = 0x99
    runOne(cpu, bus, [0xd3, 0x07]) // OUT (7),A
    expect(ports.lastOut).toEqual({ port: 0x9907, value: 0x99 })

    ports.inputValue = 0x55
    runOne(cpu, bus, [0xdb, 0x07], 2) // IN A,(7)
    expect(cpu.r.a).toBe(0x55)
  })

  it('DAA after ADD A,A on a BCD digit corrects to decimal', () => {
    const { cpu, bus } = makeTestCpu()
    cpu.r.a = 0x09
    runOne(cpu, bus, [0x87]) // ADD A,A -> 0x12
    runOne(cpu, bus, [0x27], 1) // DAA -> 0x18
    expect(cpu.r.a).toBe(0x18)
  })

})
