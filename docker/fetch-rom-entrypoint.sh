#!/bin/sh
# Tielm.js - a browser-based TI-85 emulator
# Copyright (C) 2026 the Tielm.js contributors
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

# Runs on container start via the base nginx image's /docker-entrypoint.d/
# convention (every executable *.sh in there runs before nginx starts).
#
# The TI-85 ROM is a copyrighted dump and is never baked into this image or
# committed to the repo. Instead, resolve it at runtime from one of:
#   - ROM_PATH: a ROM file already on disk in the container (bind-mount your
#     host's ROM to this path and point ROM_PATH at it).
#   - ROM_URL: a URL to download the ROM from on every container start.
# If neither is set, the ROM is left absent and the frontend (App.tsx) falls
# back to its in-browser RomLoader file-picker -- this is not a startup error.
set -u

ROM_DEST="/usr/share/nginx/html/ROM/TI85.ROM"

if [ -n "${ROM_PATH:-}" ]; then
  echo "fetch-rom-entrypoint: copying ROM from ROM_PATH=$ROM_PATH"
  mkdir -p "$(dirname "$ROM_DEST")"
  if ! cp "$ROM_PATH" "$ROM_DEST"; then
    echo "fetch-rom-entrypoint: copy from ROM_PATH failed, removing partial file" >&2
    rm -f "$ROM_DEST"
  fi
elif [ -n "${ROM_URL:-}" ]; then
  echo "fetch-rom-entrypoint: downloading ROM from ROM_URL=$ROM_URL"
  mkdir -p "$(dirname "$ROM_DEST")"
  if ! wget -q -O "$ROM_DEST" "$ROM_URL"; then
    echo "fetch-rom-entrypoint: download failed, removing partial file" >&2
    rm -f "$ROM_DEST"
  fi
else
  echo "fetch-rom-entrypoint: neither ROM_URL nor ROM_PATH set; the app will show its manual ROM upload picker instead."
fi
