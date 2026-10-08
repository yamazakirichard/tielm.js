# Tielm.js

Tielm.js is a TI-85 graphing calculator emulator that runs in the browser. It
is written in TypeScript, with a React user interface built with Vite.

It emulates the TI-85's Z80 CPU, memory paging, T6A43 LCD, keypad, timer and
interrupts closely enough to run the original TI-85 operating system. You can
use the calculator from the on-screen keypad or from your computer keyboard.

## Derived from TilEm

Tielm.js is a port of [TilEm](https://github.com/debrouxl/tilem), the C
emulator for TI Z80 calculators by Benjamin Moody and contributors. TilEm's
emulation core (`emu/`) served as the specification: the Z80 opcode tables,
TI-85 memory paging, port I/O, LCD and keypad logic were translated into
TypeScript by hand.

The original TilEm source is kept, unmodified, in [`tilem/`](tilem/) for
reference. See [`tilem/README.md`](tilem/README.md) for its origin and license.

## License

Tielm.js is free software, licensed under the **GNU General Public License
v3.0 or later**. See [`LICENSE`](LICENSE).

The Z80 test programs in `tests/zexall/vendor/` (ZEXALL/ZEXDOC by Frank D.
Cringle) are separate programs under the GPL v2. See their
[README](tests/zexall/vendor/README.md).

## No ROM included: use your own

The emulator needs a TI-85 ROM image (the calculator's operating system,
128 KB). **The ROM is copyrighted by Texas Instruments and is not included
in this repository, and must not be added to it.** You must dump the ROM
yourself from a TI-85 that you own. Tools such as TiLP and the ROM dumper
programs it uses can do this over a link cable.

You can give Tielm.js your ROM in any of these ways:

- **In the browser:** if no ROM is found, the app shows a file picker. Select
  your `.rom` dump. It is loaded locally and is not uploaded anywhere.
- **For local development:** place it at `public/ROM/TI85.ROM`, which git
  ignores, and the app loads it automatically at startup. Alternatively,
  set an environment variable and `npm run dev` copies or downloads it there
  for you:
  ```sh
  ROM_PATH=/path/to/your/TI85.ROM npm run dev
  # or
  ROM_URL=https://your-private-host/TI85.ROM npm run dev
  ```
- **In Docker:** see below.

## Requirements

- Node.js 22 or newer, and npm

## Install, run, build

```sh
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:5173)
npm test           # run the unit tests and the ZEXDOC CPU test (~30-60 s)
npm run lint       # lint with oxlint
npm run build      # type-check and build static files into dist/
npm run preview    # serve the built dist/ locally
```

The output of `npm run build` is a static site. You can host `dist/` on any
static file server. The ROM is never part of the build.

### Docker

```sh
docker build -t tielm .
# Mount your own ROM into the container:
docker run -p 8080:80 -v /path/to/TI85.ROM:/rom/TI85.ROM:ro -e ROM_PATH=/rom/TI85.ROM tielm
```

Then open <http://localhost:8080>. Without `ROM_PATH` or `ROM_URL`, the app
falls back to the in-browser file picker. `docker compose up --build` works
too; edit `docker-compose.yml` to set the ROM source.

## Project layout

```
src/core/     emulator core, pure TypeScript with no DOM or React
              (z80/, memory/, io/, devices/, calc/ti85.ts)
src/ui/       React components and hooks (screen, keypad, controls, ROM loader)
tests/        Vitest unit tests and the ZEXDOC/ZEXALL CPU test harness
scripts/      optional ROM fetch helper for local dev
docker/       container entrypoint that supplies the ROM at runtime
docs/PLAN.md  design notes and development log
tilem/        unmodified upstream TilEm source (reference only)
```
