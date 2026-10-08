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

import { useEffect, useState } from 'react'
import './App.css'
import { Controls } from './components/Controls.tsx'
import { Keyboard } from './components/Keyboard.tsx'
import { RomLoader } from './components/RomLoader.tsx'
import { Screen } from './components/Screen.tsx'
import { useEmulator } from './hooks/useEmulator.ts'
import { useKeyboardInput } from './hooks/useKeyboardInput.ts'

function App() {
  const { calc, isRunning, romLoaded, start, stop, reset, loadRom } = useEmulator()
  useKeyboardInput(calc, romLoaded)
  const [autoLoadFailed, setAutoLoadFailed] = useState(false)

  useEffect(() => {
    if (romLoaded) return
    // public/ROM/TI85.ROM is a normal static asset, served at this same path
    // identically in dev, `vite preview`, and the built dist/ -- so the app
    // comes up already powered on with no manual picker click needed. Falls
    // back to the RomLoader file picker below if it's missing (404) or the
    // fetch otherwise fails.
    fetch('/ROM/TI85.ROM')
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('not found'))))
      .then((buf) => loadRom(new Uint8Array(buf)))
      .catch(() => setAutoLoadFailed(true))
  }, [romLoaded, loadRom])

  return (
    <div className="app">
      <h1>TI-85 Emulator</h1>
      {autoLoadFailed && !romLoaded && (
        <>
          <p>Load your own TI-85 ROM image to begin.</p>
          <RomLoader onRomLoaded={loadRom} />
        </>
      )}
      {romLoaded && <Controls isRunning={isRunning} start={start} stop={stop} reset={reset} />}
      <Screen calc={calc} />
      {romLoaded && <Keyboard calc={calc} />}
    </div>
  )
}

export default App
