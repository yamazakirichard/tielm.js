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
 * Top-level TI-85 "calculator" object, tying together the Z80 core, the
 * paged memory bus, port I/O, and the LCD/keypad device state -- the
 * analog of TilEm's `TilemCalc` + `hardware_ti85` (tilem/emu/x5/x5_subcore.c),
 * collapsed into one class since this project only ever targets one model.
 */
import { Z80 } from '../z80/cpu.ts'
import { Keypad } from '../devices/keypad.ts'
import { LCD_HEIGHT, LCD_WIDTH, T6a43Lcd } from '../devices/lcd.ts'
import { ROM_SIZE, Ti85MemoryBus } from '../memory/ti85-bus.ts'
import {
  INTERRUPT_ON_KEY,
  INTERRUPT_TIMER1,
  PORT3,
  PORT4,
  PORT5,
  PORT6,
  Ti85Ports,
  type Ti85PortHost,
} from '../io/ports.ts'

/** TI-85 Z80 clock speed, in kHz (x5_init.c: tilem_z80_set_speed(calc, 6000)). */
export const CLOCK_SPEED_KHZ = 6000

/**
 * TIMER_INT's schedule, in microseconds (x5_init.c:
 * `tilem_z80_set_timer(calc, TIMER_INT, 1000, 5000, 1)` -- rt=1 means these
 * are realtime/microsecond values, converted to cycles via the clock speed,
 * matching z80.c's timer_set: `(clockspeed_kHz * count_us + 500) / 1000`).
 * tilem's own comment calls this frequency a guess ("FIXME: measure actual
 * frequency") -- it's what drives the OS's cursor blink / keyboard scan.
 */
const TIMER_INT_INITIAL_US = 1000
const TIMER_INT_PERIOD_US = 5000

function cyclesFromMicroseconds(us: number): number {
  return Math.round((CLOCK_SPEED_KHZ * us) / 1000)
}

export class Ti85Calc implements Ti85PortHost {
  readonly bus = new Ti85MemoryBus()
  readonly lcd = new T6a43Lcd()
  readonly keypad = new Keypad()
  /** Indexed by PORT3..PORT7 (x5.h's hwregs enum). */
  readonly hwregs = new Uint8Array(5)
  interrupts = 0

  readonly ports: Ti85Ports
  readonly z80: Z80
  romLoaded = false

  /** Next z80.clock value at which TIMER_INT should fire. */
  private nextTimerIntCycle = 0

  constructor() {
    this.ports = new Ti85Ports(this)
    this.z80 = new Z80(this.bus, this.ports)
    this.reset()
  }

  setInterrupts(mask: number): void {
    this.interrupts = mask & 0xff
  }

  /**
   * Matches x5_init.c's x5_reset. Notably leaves hwregs[PORT7] (link port
   * control) untouched -- tilem's x5_reset doesn't write it either, and
   * tilem_calc_reset's generic reset only zeroes hwregs once, at calc
   * construction (tilem_calc_new's memset), not on every reset.
   */
  reset(): void {
    this.hwregs[PORT3] = 0x0b
    this.hwregs[PORT4] = 0x16
    this.hwregs[PORT5] = 0x00
    this.hwregs[PORT6] = 0x40
    this.bus.reset()
    this.lcd.reset()
    this.keypad.reset()
    this.interrupts = 0
    this.z80.reset()
    this.nextTimerIntCycle = this.z80.clock + cyclesFromMicroseconds(TIMER_INT_INITIAL_US)
  }

  /** Loads a raw TI-85 ROM image (must be exactly 128KB) and resets the calc. */
  loadRom(bytes: Uint8Array): void {
    if (bytes.length !== ROM_SIZE) {
      throw new Error(`TI-85 ROM must be exactly ${ROM_SIZE} bytes (got ${bytes.length})`)
    }
    this.bus.rom.set(bytes)
    this.romLoaded = true
    this.reset()
  }

  /** Runs the Z80 for at least `cycles` clock cycles (stops after the instruction that reaches or passes the target). Returns cycles actually run. */
  runForCycles(cycles: number): number {
    const target = this.z80.clock + cycles
    let ran = 0
    while (this.z80.clock < target) {
      this.z80.interruptLine = this.interrupts !== 0
      ran += this.z80.step()
      if (this.z80.clock >= this.nextTimerIntCycle) this.fireTimerInt()
    }
    return ran
  }

  /** Ported from x5_z80_ptimer: fires only if the OS has armed TIMER1 via port 3 bit 1. */
  private fireTimerInt(): void {
    if (this.hwregs[PORT3] & 0x02) this.interrupts |= INTERRUPT_TIMER1
    this.nextTimerIntCycle += cyclesFromMicroseconds(TIMER_INT_PERIOD_US)
  }

  pressKey(scancode: number): void {
    if (this.keypad.pressKey(scancode)) this.interrupts |= INTERRUPT_ON_KEY
  }

  releaseKey(scancode: number): void {
    if (this.keypad.releaseKey(scancode)) this.interrupts |= INTERRUPT_ON_KEY
  }

  /**
   * While inactive (port 3 bit 3 clear -- e.g. right after reset, before the
   * OS re-powers the LCD during boot) a real T6A43 shows nothing, since the
   * panel isn't scanning; reading RAM anyway would render whatever stale
   * bytes are sitting at the last frame address as pixel noise.
   */
  getFrame(): Uint8Array {
    if (!this.lcd.active) return new Uint8Array((LCD_WIDTH / 8) * LCD_HEIGHT)
    return this.lcd.getFrameData(this.bus.ram)
  }
}
