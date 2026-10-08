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
 * TI-85 port I/O dispatch. Ported from tilem/emu/x5/x5_io.c's x5_z80_in/
 * x5_z80_out. Only the low 3 bits of the port address are decoded
 * (portmask 0x07 in hardware_ti85), matching `switch (port & 0xff)` on
 * ports 0-7 in the C source.
 */
import type { PortIO } from '../z80/cpu.ts'
import type { T6a43Lcd } from '../devices/lcd.ts'
import type { Keypad } from '../devices/keypad.ts'
import type { Ti85MemoryBus } from '../memory/ti85-bus.ts'

export const PORT3 = 0
export const PORT4 = 1
export const PORT5 = 2
export const PORT6 = 3
export const PORT7 = 4

export const INTERRUPT_ON_KEY = 0x01
export const INTERRUPT_TIMER1 = 0x02

/** Everything ports.ts needs from the surrounding calc, kept minimal to avoid a circular import with calc/ti85.ts. */
export interface Ti85PortHost {
  bus: Ti85MemoryBus
  lcd: T6a43Lcd
  keypad: Keypad
  /** Indexed by PORT3..PORT7 (see x5.h's hwregs enum). */
  hwregs: Uint8Array
  interrupts: number
  setInterrupts(mask: number): void
}

export class Ti85Ports implements PortIO {
  private readonly host: Ti85PortHost

  constructor(host: Ti85PortHost) {
    this.host = host
  }

  input(port: number): number {
    const h = this.host
    switch (port & 0xff) {
      case 0x01:
        return h.keypad.readKeys()
      case 0x03: {
        let v = h.keypad.onKeyDown ? 0x00 : 0x08
        if (h.interrupts & INTERRUPT_ON_KEY) v |= 0x01
        if (h.interrupts & INTERRUPT_TIMER1) v |= 0x02
        return v
      }
      case 0x04:
        return 0x01
      case 0x05:
        return h.hwregs[PORT5]
      case 0x06:
        return h.hwregs[PORT6]
      case 0x07:
        // Link port: no cable/peer emulated in v1. Always reporting the idle
        // line state (both lines released/high, matching tilem_linkport_get_lines
        // with no external device pulling either line low) rather than echoing
        // back whatever was last written -- the real ROM's boot sequence polls
        // this port waiting for a definite idle/no-cable signal before it'll
        // proceed past its link/backup-check step (confirmed by disassembly).
        // Echoing the write-in-progress register value instead left it live-
        // locked there forever. See docs/PLAN.md's M7 entry for the full story
        // (this fixed one blocker; a separate, still-unresolved one prevents
        // the OS from ever scanning the keyboard matrix afterward).
        return 3
      default:
        return 0x00
    }
  }

  output(port: number, value: number): void {
    const h = this.host
    switch (port & 0xff) {
      case 0x00:
        h.lcd.setAddrFromPort0(value)
        break
      case 0x01:
        h.keypad.setGroup(value)
        break
      case 0x02:
        h.lcd.setContrastFromPort2(value)
        break
      case 0x03: {
        if (value & 0x01) {
          h.keypad.onKeyInt = true
        } else {
          h.setInterrupts(h.interrupts & ~INTERRUPT_ON_KEY)
          h.keypad.onKeyInt = false
        }
        if (!(value & 0x02)) {
          h.setInterrupts(h.interrupts & ~INTERRUPT_TIMER1)
        }
        h.hwregs[PORT3] = value
        h.lcd.active = (value & 0x08) !== 0
        break
      }
      case 0x04:
        h.hwregs[PORT4] = value
        h.lcd.setRowstrideFromPort4(value)
        break
      case 0x05:
        h.hwregs[PORT5] = value
        this.setupMapping()
        break
      case 0x06:
        h.hwregs[PORT6] = value
        this.setupMapping()
        break
      case 0x07:
        // Link port: stubbed (no cable in v1); still latch the register for port 7 reads.
        h.hwregs[PORT7] = value
        break
    }
  }

  /** Ported from x5_io.c's setup_mapping: derives windows 1/2 from ports 5/6. */
  private setupMapping(): void {
    const h = this.host
    const pageA = h.hwregs[PORT5] & 0x40 ? 0x08 | (h.hwregs[PORT5] & 1) : h.hwregs[PORT5] & 7
    const pageB = h.hwregs[PORT6] & 0x40 ? 0x08 | (h.hwregs[PORT6] & 1) : h.hwregs[PORT6] & 7
    h.bus.setPage(1, pageA)
    h.bus.setPage(2, pageB)
  }
}
