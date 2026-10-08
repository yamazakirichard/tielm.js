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

interface ControlsProps {
  isRunning: boolean
  start: () => void
  stop: () => void
  reset: () => void
}

/** Start/Pause and Reset controls for the running emulator. */
export function Controls({ isRunning, start, stop, reset }: ControlsProps) {
  return (
    <div className="controls">
      <button type="button" onClick={isRunning ? stop : start}>
        {isRunning ? 'Pause' : 'Resume'}
      </button>
      <button type="button" onClick={reset}>
        Reset
      </button>
    </div>
  )
}
