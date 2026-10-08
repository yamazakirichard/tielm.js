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

import type { ChangeEvent } from 'react'
import { ROM_SIZE } from '../../core/memory/ti85-bus.ts'

interface RomLoaderProps {
  onRomLoaded: (bytes: Uint8Array) => void
}

/** File-picker for the user's own TI-85 ROM dump; validates size before handing it to the emulator core. */
export function RomLoader({ onRomLoaded }: RomLoaderProps) {
  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file) return

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes.length !== ROM_SIZE) {
      window.alert(`Expected a ${ROM_SIZE}-byte TI-85 ROM image, but "${file.name}" is ${bytes.length} bytes.`)
      return
    }
    onRomLoaded(bytes)
  }

  return (
    <label className="rom-loader">
      Load TI-85 ROM: <input type="file" accept=".rom,.85u,.bin" onChange={handleChange} />
    </label>
  )
}
