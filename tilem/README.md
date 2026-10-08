# TilEm — upstream reference source

This directory contains the source code of **TilEm**, the open-source emulator
and debugger for TI Z80-based graphing calculators, by Benjamin Moody, Solignac
Julien, Thibault Duponchelle and contributors.

It is included here **unmodified**, as the reference that Tielm.js was ported
from. Tielm.js's TypeScript emulator core (`src/core/`) is a hand-written port
of TilEm's emulation library (`emu/`, in particular the Z80 core and the TI-85
hardware in `emu/x5/`). Nothing in this directory is compiled, linked or bundled
into Tielm.js.

## Origin

- Upstream repository: <https://github.com/debrouxl/tilem>
- Commit: `f56ad63` ("Small doc updates")
- Project website: <http://lpg.ticalc.org/prj_tilem/>

Only the upstream `.git` history was left out. Every other file matches that
commit byte for byte.

## License

TilEm is free software, distributed under the terms stated in its own files:

- the TilEm package as a whole, including the GTK and Qt front-ends, is
  licensed under the **GNU General Public License, version 3**. See
  [`COPYING`](COPYING).
- the core emulation library (`emu/`) is licensed under the **GNU Lesser
  General Public License, version 2.1 or (at your option) any later version**,
  as stated in the header of each file.
- some skin images in `data/skins/` carry their own terms (GFDL, GPLv3+,
  LGPL 2.1), listed in [`data/skins/README`](data/skins/README).

Tielm.js, as a work derived from TilEm, is distributed under the GNU General
Public License version 3 (see [`../LICENSE`](../LICENSE)). The LGPL 2.1+
explicitly allows this.

No calculator ROM images are included. TilEm, like Tielm.js, requires the
user to supply their own.
