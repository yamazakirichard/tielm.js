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

import { useEffect, useRef } from 'react'
import type { Ti85Calc } from '../../core/calc/ti85.ts'
import { LCD_HEIGHT, LCD_WIDTH } from '../../core/devices/lcd.ts'
import { unpackFrame } from '../lcd-render.ts'

const SCALE = 3

interface ScreenProps {
  calc: Ti85Calc
}

/** 128x64 canvas that redraws itself from calc.getFrame() on its own rAF loop, independent of the stepping loop in useEmulator. */
export function Screen({ calc }: ScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let raf: number
    const draw = () => {
      const rgba = unpackFrame(calc.getFrame(), LCD_WIDTH, LCD_HEIGHT)
      ctx.putImageData(new ImageData(rgba, LCD_WIDTH, LCD_HEIGHT), 0, 0)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [calc])

  return (
    <canvas
      ref={canvasRef}
      width={LCD_WIDTH}
      height={LCD_HEIGHT}
      style={{
        width: LCD_WIDTH * SCALE,
        height: LCD_HEIGHT * SCALE,
        imageRendering: 'pixelated',
        border: '2px solid #333',
      }}
    />
  )
}
