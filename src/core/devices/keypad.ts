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
 * TI-85 keypad matrix. Ported from tilem/emu/keypad.c. An 8x8 matrix of
 * keys, read out 8 bits at a time via port 1 (write selects which key
 * "groups" are active-low-selected, read returns which keys in the
 * selected groups are down, active-low). The "ghosting" loop mirrors real
 * keyboard matrix hardware: if two keys sharing a row are both down, a
 * third key at the intersection of their columns can appear pressed too.
 *
 * Scancodes are 1-64 (row = (scancode-1)/8, column bit = (scancode-1)%8);
 * scancode 0x29 (TILEM_KEY_ON in tilem/emu/scancodes.h) is the dedicated ON
 * key, wired directly to its own interrupt line rather than through the
 * matrix -- it's a real matrix position (row 5, per x5_subcore.c's keynames),
 * but the hardware also wires it to a separate interrupt line, so tilem
 * (and this port) special-case it rather than routing it through
 * keysDown[]/readKeys() at all.
 */
export const KEY_ON = 0x29

export class Keypad {
  group = 0xff
  onKeyDown = false
  onKeyInt = false
  readonly keysDown = new Uint8Array(8)

  reset(): void {
    this.group = 0xff
    this.onKeyDown = false
    this.onKeyInt = false
    this.keysDown.fill(0)
  }

  setGroup(value: number): void {
    this.group = value & 0xff
  }

  /** Active-low: returns 0 bits for keys currently down in a selected group. */
  readKeys(): number {
    let keys = 0
    for (let i = 0; i < 8; i++) {
      if (!(this.group & (1 << i))) keys |= this.keysDown[i]
    }

    let old: number
    do {
      old = keys
      for (let i = 0; i < 8; i++) {
        if (keys & this.keysDown[i]) keys |= this.keysDown[i]
      }
    } while (keys !== old)

    return ~keys & 0xff
  }

  /** Returns true if the ON-key interrupt line should be raised (caller sets the interrupt bit). */
  pressKey(scancode: number): boolean {
    if (scancode === KEY_ON) {
      const shouldInterrupt = !this.onKeyDown && this.onKeyInt
      this.onKeyDown = true
      return shouldInterrupt
    }
    if (scancode > 0 && scancode < 65) {
      const sc = scancode - 1
      this.keysDown[sc >> 3] |= 1 << (sc & 7)
    }
    return false
  }

  releaseKey(scancode: number): boolean {
    if (scancode === KEY_ON) {
      const shouldInterrupt = this.onKeyDown && this.onKeyInt
      this.onKeyDown = false
      return shouldInterrupt
    }
    if (scancode > 0 && scancode < 65) {
      const sc = scancode - 1
      this.keysDown[sc >> 3] &= ~(1 << (sc & 7))
    }
    return false
  }
}
