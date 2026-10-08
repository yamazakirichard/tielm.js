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

import { useCallback, useEffect, useRef, useState } from 'react'
import { CLOCK_SPEED_KHZ, Ti85Calc } from '../../core/calc/ti85.ts'
import { KEY_ON } from '../../core/devices/keypad.ts'
import { MIN_HOLD_MS } from '../keyHold.ts'

/** Longest real-time gap (ms) a single frame will try to catch up on, to avoid a runaway burst after the tab is backgrounded. */
const MAX_FRAME_MS = 100

/** Same hold duration the on-screen/physical ON key is stretched to (see keyHold.ts), converted to cycles. */
const ON_KEY_HOLD_CYCLES = Math.round(MIN_HOLD_MS * CLOCK_SPEED_KHZ)

/**
 * Generous upper bound for cold-boot init to reach its post-reset HALT and
 * arm the ON-key interrupt (measured empirically at ~1.2M cycles against
 * the real ROM -- the ON-key interrupt is edge-triggered and only armed
 * once the ROM's own init code writes to port 3, so pressing ON before
 * that point is silently dropped).
 */
const COLD_BOOT_MAX_CYCLES = 10_000_000

/** Fast-forwards past cold-boot init, then presses and holds ON long enough to pass the ROM's debounce, so the calculator boots to the home screen with no user interaction. */
function powerOn(calc: Ti85Calc): void {
  let ran = 0
  while (!calc.z80.halted && ran < COLD_BOOT_MAX_CYCLES) {
    ran += calc.runForCycles(10_000)
  }
  calc.pressKey(KEY_ON)
  calc.runForCycles(ON_KEY_HOLD_CYCLES)
  calc.releaseKey(KEY_ON)
}

export interface EmulatorApi {
  calc: Ti85Calc
  isRunning: boolean
  romLoaded: boolean
  start: () => void
  stop: () => void
  reset: () => void
  loadRom: (bytes: Uint8Array) => void
}

/**
 * Owns a single Ti85Calc instance for the component tree's lifetime and
 * drives it with a requestAnimationFrame loop, converting real elapsed time
 * into a cycle count via the TI-85's 6MHz clock (CLOCK_SPEED_KHZ cycles/ms).
 * Rendering is handled separately by Screen.tsx, which reads calc.getFrame()
 * on its own rAF loop -- this hook only steps the CPU forward.
 */
export function useEmulator(): EmulatorApi {
  const calcRef = useRef<Ti85Calc | null>(null)
  if (calcRef.current === null) calcRef.current = new Ti85Calc()

  const runningRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [romLoaded, setRomLoaded] = useState(false)

  const loop = useCallback((time: number) => {
    if (!runningRef.current) return
    const last = lastTimeRef.current ?? time
    const elapsedMs = Math.min(time - last, MAX_FRAME_MS)
    lastTimeRef.current = time
    const cycles = Math.round(elapsedMs * CLOCK_SPEED_KHZ)
    if (cycles > 0) calcRef.current!.runForCycles(cycles)
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const start = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    lastTimeRef.current = null
    setIsRunning(true)
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  const stop = useCallback(() => {
    runningRef.current = false
    setIsRunning(false)
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  const reset = useCallback(() => {
    calcRef.current!.reset()
  }, [])

  const loadRom = useCallback(
    (bytes: Uint8Array) => {
      const calc = calcRef.current!
      calc.loadRom(bytes)
      setRomLoaded(true)
      // Real hardware cold-boots into a HALT waiting for the ON key
      // (confirmed against the actual ROM: it never touches RAM or powers
      // the LCD before this). Driving press/release off real wall-clock
      // time (as a human click or keyHold.ts's DOM-event stretching does)
      // makes the ROM's ~2400-iteration debounce loop fussy to land
      // reliably; running the hold as a fixed cycle count instead is
      // deterministic and lands correctly across a wide margin (verified
      // against the real ROM from ~1.8M-4.8M held cycles, well past
      // ON_KEY_HOLD_CYCLES on either side).
      powerOn(calc)
      start()
    },
    [start],
  )

  useEffect(() => stop, [stop])

  return { calc: calcRef.current, isRunning, romLoaded, start, stop, reset, loadRom }
}
