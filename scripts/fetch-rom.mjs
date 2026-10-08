#!/usr/bin/env node
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
 * Optional local-dev helper: populates the gitignored public/ROM/TI85.ROM
 * from a ROM you dumped from your own calculator. No ROM is bundled or
 * downloaded by default -- it does nothing unless ROM_PATH or ROM_URL is set.
 * Never run as part of `build` -- the ROM stays out of dist/ and out
 * of git; the deployed container sources it at runtime instead (see
 * docker/fetch-rom-entrypoint.sh), and App.tsx falls back to RomLoader.tsx's
 * file picker if it's absent.
 *
 * Respects the same ROM_URL / ROM_PATH env vars as the Docker entrypoint:
 *   - ROM_PATH: copy the ROM from this local file path.
 *   - ROM_URL: download the ROM from this URL (e.g. your own private copy).
 * If neither is set, this script exits without doing anything.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROM_URL = process.env.ROM_URL
const ROM_PATH = process.env.ROM_PATH
const ROM_SIZE = 128 * 1024

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const romPath = path.join(rootDir, 'public', 'ROM', 'TI85.ROM')

function checkSize(bytes, source) {
  if (bytes.length !== ROM_SIZE) {
    throw new Error(`ROM from ${source} is ${bytes.length} bytes, expected exactly ${ROM_SIZE} (128KB)`)
  }
}

async function main() {
  const existing = await stat(romPath).catch(() => null)
  if (existing?.isFile() && existing.size === ROM_SIZE) {
    console.log(`ROM already present at ${romPath}, skipping fetch.`)
    return
  }
  if (!ROM_PATH && !ROM_URL) {
    console.log('No ROM_PATH or ROM_URL set; the app will ask for your own TI-85 ROM dump in the browser.')
    return
  }

  let bytes
  if (ROM_PATH) {
    console.log(`Copying TI-85 ROM from ROM_PATH=${ROM_PATH} ...`)
    bytes = await readFile(ROM_PATH)
    checkSize(bytes, ROM_PATH)
  } else {
    console.log(`Fetching TI-85 ROM from ${ROM_URL} ...`)
    const res = await fetch(ROM_URL)
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
    }
    bytes = new Uint8Array(await res.arrayBuffer())
    checkSize(bytes, ROM_URL)
  }

  await mkdir(path.dirname(romPath), { recursive: true })
  await writeFile(romPath, bytes)
  console.log(`Wrote ${romPath} (${bytes.length} bytes).`)
}

main().catch((err) => {
  // Non-fatal: boot-rom-check.test.ts skips itself when the ROM isn't
  // present, and RomLoader.tsx still works via manual file picker either
  // way -- an offline dev/test run shouldn't be blocked on this.
  console.warn(`Skipping ROM fetch: ${err.message}`)
})
