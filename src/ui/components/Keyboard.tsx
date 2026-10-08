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

import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Ti85Calc } from '../../core/calc/ti85.ts'
import { SCANCODE_LABELS } from '../../core/devices/scancodes.ts'
import { pressWithMinHold, releaseWithMinHold } from '../keyHold.ts'
import { VISUAL_KEYPAD_LAYOUT, type VisualKey, type VisualSlot } from './keyboardLayout.ts'
import './Keyboard.css'

interface KeyboardProps {
  calc: Ti85Calc
}

const SCANCODE_2ND = 54
const SCANCODE_ALPHA = 48

/** On-screen keypad mirroring the TI-85's real physical layout (see keyboardLayout.ts); mouse/touch press+release drive calc.pressKey/releaseKey (stretched to a minimum hold, see keyHold.ts). */
export function Keyboard({ calc }: KeyboardProps) {
  const press = (scancode: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pressWithMinHold(calc, scancode)
  }
  const release = (scancode: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    releaseWithMinHold(calc, scancode)
  }

  const modifierClass = (scancode: number): string => {
    if (scancode === SCANCODE_2ND) return 'key--2nd'
    if (scancode === SCANCODE_ALPHA) return 'key--alpha'
    return ''
  }

  const renderKey = (slot: VisualSlot, key: number | string, extraClass = '') => {
    if (slot === null) {
      return <span className="key key-spacer" key={key} />
    }
    const cls = `key ${modifierClass(slot.scancode)} ${extraClass}`.trim()
    return (
      <button
        type="button"
        className={cls}
        key={key}
        onPointerDown={press(slot.scancode)}
        onPointerUp={release(slot.scancode)}
        onPointerLeave={release(slot.scancode)}
      >
        {(slot.secondary || slot.alpha) && (
          <span className="key-legends">
            <span className="key-secondary">{slot.secondary}</span>
            <span className="key-alpha">{slot.alpha}</span>
          </span>
        )}
        <span className="key-main">{SCANCODE_LABELS.get(slot.scancode)}</span>
      </button>
    )
  }

  const renderDiamondKey = (slot: VisualKey, className: string) => (
    <span className={className} key={className}>
      {renderKey(slot, `${className}-key`)}
    </span>
  )

  return (
    <div className="keyboard">
      {VISUAL_KEYPAD_LAYOUT.map((row, i) => {
        if (row.type === 'row') {
          const rowClass = row.variant === 'function' ? 'keyboard-row keyboard-row--function' : 'keyboard-row'
          const keyClass = row.variant === 'function' ? 'key--function' : ''
          return (
            <div className={rowClass} key={i}>
              {row.keys.map((slot, j) => renderKey(slot, j, keyClass))}
            </div>
          )
        }
        return (
          <div className="keyboard-row keyboard-row--nav" key={i}>
            <div className="nav-left">
              {row.left.map((r, ri) => (
                <div className="nav-left-row" key={ri}>
                  {r.map((slot, j) => renderKey(slot, `${ri}-${j}`))}
                </div>
              ))}
            </div>
            <div className="nav-diamond">
              {renderDiamondKey(row.diamond.up, 'nav-diamond-up')}
              {renderDiamondKey(row.diamond.left, 'nav-diamond-left')}
              {renderDiamondKey(row.diamond.right, 'nav-diamond-right')}
              {renderDiamondKey(row.diamond.down, 'nav-diamond-down')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
