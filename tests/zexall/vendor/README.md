# ZEXALL / ZEXDOC test binaries

`zexall.com` and `zexdoc.com` are Frank D. Cringle's Z80 instruction-set
exercisers for CP/M-80 (ZEXDOC checks documented flag behavior; ZEXALL also
checks undocumented flags). They are licensed under the GNU General Public
License v2.0.

Fetched from https://github.com/agn453/ZEXALL (binaries extracted there from
YAZE-AG 2.51.3, curated by Andreas Gerlich).

These are CP/M `.com` programs: raw Z80 machine code assembled to load at
0x0100, exactly like any other Z80 binary the emulator core might run. They
are not linked into or derived from this project's source — `run-zexall.ts`
loads them into a flat 64KB RAM image and executes them as-is, the same way
`ti85.ts` will later load a TI-85 ROM image.
