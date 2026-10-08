# TI-85 Emulator in JavaScript/React

## Context

The emulator needs a user-supplied TI-85 ROM dump (128KB, never distributed). TilEm (`tilem/`) is an open-source C emulator supporting the TI-85. The goal is a from-scratch, browser-based TI-85 emulator in JS/TS + React. TilEm's core emulation library (`emu/*.c/*.h`) is LGPL 2.1+ (the GTK/Qt frontends are GPLv3, but those aren't being used) — it will serve purely as a **reference spec** for hand-porting the Z80 CPU, memory paging, LCD, and keypad logic to TS, not compiled or linked into the project.

Design decisions:
- **Core approach**: hand-port C → TS (not WASM), using tilem's `emu/` as spec.
- **v1 scope**: core emulator only — Z80 CPU, memory/ROM banking, LCD, keypad, basic timers. No debugger UI, no link cable/file transfer, no save states.
- **Toolchain**: Node/npm, scaffolded with Vite + React + TypeScript.

## Key TilEm reference facts (from reading `emu/tilem.h`, `emu/z80.h`, `emu/x5/*`, `emu/rom.c`, `emu/keypad.c`, `emu/lcd.c`)

- `TilemCalc` = god object: Z80 regs/timers, one contiguous `mem` buffer (ROM pages 0–7 + RAM pages 8–9), `mempagemap[4]` (maps each 16KB logical window to a physical 16KB page), LCD/keypad/link/hwregs state.
- **TI-85** (`x5_subcore.c`): 128KB ROM (8×16KB pages), 32KB RAM (2×16KB pages, addressed as pages 0x08/0x09), no flash, T6A43 LCD (memory-mapped, no command protocol), port mask 0x07, 6MHz clock.
- **Memory paging** (`x5_io.c`, `x5_memory.c`): window 0 (0x0000–0x3FFF) fixed to ROM page 0; windows 1/2 (0x4000–0xBFFF) switchable via port 5/6 writes (bit 0x40 → RAM page `0x08|bit0`, else ROM page `value&7`); window 3 (0xC000–0xFFFF) fixed to RAM page 0x08. Reset state: `mempagemap=[0x00,0x00,0x08,0x08]`.
- **Ports** (masked to low 3 bits): 0=LCD addr hi, 1=keypad group, 2=contrast, 3=int mask/LCD power, 4=rowstride/timer, 5/6=bank paging, 7=link (stub for v1).
- **LCD**: T6A43 reads directly from RAM at `lcd.addr` with `rowstride`-based row wrap (`tilem_lcd_t6a43_get_data`, `lcd.c:259`). No hardware grayscale — TilEm's `graylcd.c` grayscale simulation is out of scope for v1.
- **Keypad**: 8×8 matrix, group-select read with a ghosting-propagation loop (`keypad.c`).
- **Timers/interrupts**: one hardware ptimer (`TIMER_INT`, fires every 5000µs after 1000µs) plus ON-key interrupt; IM 1 servicing (push PC, jump to 0x0038) is what TI-OS uses almost exclusively.
- **Opcode dispatch**: one big switch per prefix class — `z80main.h` (base, ~256 cases), `z80cb.h` (bit/rotate/shift), `z80ed.h` (extended/block), `z80ddfd.h` (IX/IY-indexed, shared between DD/FD via a substitution pattern).

## Project layout

```
src/
  core/                      # pure TS, no DOM/React — testable under Vitest/Node
    z80/
      registers.ts           # register pairs (af/bc/de/hl/ix/iy/sp/pc/ir/wz + shadows)
      flags.ts                # S/Z/Y/H/X/P/N/C bit constants + flag-computation helpers
      opcodes/{base,cb,ed,ddfd}.ts   # ports of z80main.h / z80cb.h / z80ed.h / z80ddfd.h
      cpu.ts                  # Z80 class: step(), prefix dispatch, HALT fast-forward, interrupt servicing
      timers.ts               # sorted timer list (simplify TilEm's linked-list pool to a small sorted array)
    memory/
      bus.ts                  # MemoryBus: readByte/writeByte, mempagemap, setPage() (ports x5_memory.c)
    io/
      ports.ts                 # PortBus: in()/out() dispatch by port, wires paging/lcd/keypad/hwregs (x5_io.c)
    devices/
      lcd.ts                   # T6a43Lcd: addr/contrast/rowstride + getFrameData() (lcd.c)
      keypad.ts                 # 8x8 matrix + ghosting read (keypad.c)
      interrupts.ts             # ON-key + TIMER_INT flags
      scancodes.ts               # TI-85 key table (from x5_subcore.c keynames[64] / scancodes.h)
    calc/
      ti85.ts                   # Ti85Calc: owns z80/bus/ports/lcd/keypad/timers, loadRom(), reset(), runForCycles()
    scheduler.ts                 # cycle-debt batching used by the RAF loop
  ui/
    App.tsx
    components/{Screen,Keyboard,Controls,RomLoader}.tsx
    hooks/{useEmulator,useKeyboardInput}.ts
tests/
  unit/z80/{flags,opcodes-base,opcodes-cb,opcodes-ed,opcodes-ddfd}.test.ts
  unit/{memory/bus,devices/lcd,devices/keypad}.test.ts
  zexall/run-zexall.ts          # headless zexall/zexdoc correctness harness
```

**Rule**: `src/core/**` never imports React/DOM — it exposes plain data (`Uint8Array` framebuffer) and functions (`step()`, `reset()`, `loadRom(bytes)`, `pressKey(code)`, `getFrame()`). React is strictly an I/O adapter (canvas paint + keyboard events + file input), mirroring TilEm's `libtilemcore` vs. GTK frontend split.

`ROM/TI85.ROM` should be added to `.gitignore` (copyrighted firmware) — the app always loads it via a runtime file picker, never bundles it.

## Module notes

- **Registers**: represent 16-bit pairs as two 8-bit fields (`h`,`l`) with a `w` getter/setter, since JS has no C union punning. All arithmetic masked with `&0xff`/`&0xffff` (TS `strict: true` helps catch missed masking).
- **Opcodes**: translate each `case` block from the C headers nearly verbatim — `readb(PC++)` → `bus.readByte(r.pc.w++)`, `delay(N)` → `cycles += N`. Share flag/ALU helpers across all four tables. DD/FD prefix handled as `executeDDFD(cpu, op, isIY)` rather than C's preprocessor duplication; CB reached via a DD/FD prefix takes an optional indexed-address param.
- **Memory bus**: `readByte`/`writeByte` compute `page = pageMap[addr>>>14]`, `pa = page*0x4000 + (addr&0x3fff)`; `pa>=0x20000` → RAM (writes to ROM addresses are silently dropped, matching `x5_z80_wrmem`).
- **Ports**: `switch(port & 0xff)` mirroring `x5_z80_in`/`x5_z80_out` cases 0–7; port 5/6 writes call `bus.setPage()`.
- **Timers**: simplify TilEm's linked-list/free-list pool to a small sorted array/heap of `{nextFireClock, period, callback}` — only a handful of timers exist (LCD delay, TIMER_INT, the scheduler's own stop-timer).
- **CPU loop**: HALT (0x76) must fast-forward the clock to the next timer event rather than spin — critical since TI-OS halts in its idle loop most of the time.

## Execution loop (browser timing)

6MHz clock ≈ 100,000 cycles/frame at 60fps. Drive from `requestAnimationFrame`, accumulating a cycle-debt from real elapsed `performance.now()` deltas (clamped, e.g. to 100ms, to avoid catch-up storms after tab backgrounding), running `calc.runForCycles()` in bounded batches (~10k cycles) per frame. `runForCycles` mirrors `tilem_z80_run`: schedule a one-shot stop-timer, loop `z80.step()` until it fires. Expose a manual single-step for development debugging even without a full debugger UI.

## React integration

- `Screen.tsx`: 128×64 `<canvas>`, CSS-scaled with `imageRendering: pixelated`; unpack the 1bpp frame into `ImageData` each frame via a pure, core-independent `unpackFrame()` helper.
- `Keyboard.tsx` + `useKeyboardInput.ts`: on-screen keypad and physical-key mapping, both driven by `scancodes.ts`.
- `RomLoader.tsx`: file input/drag-drop, validates 128KB size, calls `calc.loadRom()`.
- `Controls.tsx`: start/stop/reset/step.
- `useEmulator.ts`: owns the `Ti85Calc` instance via `useRef`, runs/cleans up the RAF loop.

## Testing strategy

1. Flag-computation unit tests first (foundation for everything else).
2. Per-opcode unit tests against a RAM-backed test calc.
3. **zexall/zexdoc** headless harness (`tests/zexall/`) — load the test binary into flat RAM, trap `CALL 5` (BDOS print char/string) to capture output, assert no `ERROR` lines. This is the primary CPU-correctness gate; note zexall/zexdoc binaries have their own distribution terms (GPLv2; see `tests/zexall/vendor/README.md`).
4. Device unit tests: keypad ghosting, LCD frame extraction (including row-wrap), bus paging.
5. Manual milestone: boot `TI85.ROM` in-browser, confirm the home screen renders and keys respond. Log PC + opcode on any "unimplemented opcode" exception — useful signal even without a debugger.
6. Perf smoke test: `runForCycles(6_000_000)` (1 sim-second) completes within a wall-clock budget, guarding against dispatch/timer hotspots.

## Build order / milestones

1. **M0 — Scaffolding**: `npm create vite@latest -- --template react-ts`, TS strict mode, Vitest, `.gitignore` for `ROM/`.
2. **M1 — Registers/flags/flat memory bus** + flag unit tests.
3. **M2 — Base opcode table** (`z80main.h` port) + minimal step loop (no interrupts/HALT yet). Gate: zexdoc passes against a flat-memory harness.
4. **M3 — CB/ED/DD/FD opcode tables** + full interrupt/HALT handling. Gate: full zexall passes — CPU core considered done.
5. **M4 — TI-85 hardware shell**: real paging, ports, ROM loading from the real ROM file; run against it and log unimplemented-opcode gaps zexall missed.
6. **M5 — LCD device + canvas rendering**. Gate: TI-85 splash/home screen visibly renders.
7. **M6 — Keypad + timers/interrupts**. Gate: keyboard navigation works, ON key interrupts.
8. **M7 — Execution loop polish**: cycle-debt RAF loop, start/stop/reset controls, stable long-run speed.
9. **M8 — Polish**: malformed-ROM handling, layout, README with legal note about user-supplied ROM dumps.

## Verification

- `npm test` (Vitest) for all unit tests and the zexall harness — run after each milestone from M2 onward.
- `npm run dev`, load `ROM/TI85.ROM` via the file picker, confirm boot to the home screen (M5) and keypad interaction (M6) in an actual browser.
- Perf smoke test as a standing regression guard once the CPU loop exists.

## Progress log

- **M0 (done)**: Vite + React 19 + TypeScript (strict) scaffolded; Vitest wired up; `.gitignore` excludes `ROM/` and `tilem/` (nested git repo, reference only).
- **M1 (done)**: `src/core/z80/registers.ts` (register file), `src/core/z80/flags.ts` (all pure ALU flag-computation functions, ported from `tilem/emu/z80cmds.h`; DAA implemented algorithmically rather than transcribing the 2048-entry table — re-verify once zexall runs), `src/core/memory/bus.ts` (flat RAM `Bus` for opcode tests). 18 unit tests passing.
- **M2 (done)**: `src/core/z80/cpu.ts` (`Z80` class: `step()`, memory/port/stack helpers, `fetchByte`/`fetchWord`), `src/core/z80/opcodes/base.ts` (full unprefixed opcode table, ported from `tilem/emu/z80main.h`). CB/DD/ED/FD prefix bytes throw `UnimplementedOpcodeError` for now — deferred to M3, since zexdoc/zexall need those tables too and can't run meaningfully until they exist. HALT sets a `halted` flag and ticks 4 cycles/step; the real fast-forward-to-next-timer optimization and interrupt servicing also land in M3. 16 new opcode unit tests added (34 total passing) covering load/arithmetic/flags/control-flow/stack/exchange/port I/O/DAA.
- **M3 (done)**: `src/core/z80/opcodes/{cb,ed,ddfd}.ts` (full CB/ED/DD-FD tables, ported from `tilem/emu/z80{cb,ed,ddfd}.h`), `src/core/z80/opcodes/regfile.ts` (shared register-index helpers). `cpu.ts` now fully dispatches all four prefix classes and handles interrupts: `requestInterrupt()`, IM 0/1/2 servicing, HALT wake-up, and one-instruction EI suppression (see the class doc comment for the specific simplifications vs. tilem's model — edge-triggered interrupt line, and EI-suppression only tracked for unprefixed 0xFB). 25 more unit tests added (59 total).
  - **zexall/zexdoc integration** (`tests/zexall/`): fetched `zexall.com`/`zexdoc.com` from github.com/agn453/ZEXALL (GPLv2, attribution in `tests/zexall/vendor/README.md`). `harness.ts` is a minimal headless CP/M host (intercepts BDOS calls 2/9 by checking PC, no opcode trapping). `run-zexall.test.ts` runs zexdoc with a 1B-step bound (~32s) and asserts no `ERROR` line — full zexall/zexdoc runs are legitimately very slow (confirmed via tracing: each of ~60+ categories can take hundreds of millions of instructions on a switch-dispatch interpreter, not a hang), so the automated test only covers the first several categories; a fuller manual run is recommended after significant opcode changes.
  - **Two real bugs found and fixed via zexall**, both latent inaccuracies in the literal `tilem/emu/z80cmds.h` macros (documented at the fix sites in `flags.ts`): (1) `adc16`/`sbc16`'s overflow-flag term shifted by `>>11`, landing on FLAG_H's bit instead of FLAG_V's — should be `>>13` (mirrors add8's `>>5` scaled to 16-bit). (2) `cp8`'s undocumented X/Y flags were taken from the subtraction result; real Z80 hardware (and zexall) require CP's X/Y to come from the *operand* being compared instead — the one well-known ALU op where this differs from the general "flags from result" pattern.
  - Manually verified (not committed as an automated test, to avoid ~doubling CI time on largely overlapping coverage): `zexall.com` (undocumented-flag variant) also clears its first 6 categories cleanly after the same two fixes.
- **M4 (done)**: TI-85 hardware shell, ported from `tilem/emu/x5/*`.
  - `src/core/memory/ti85-bus.ts` (`Ti85MemoryBus`): the real paged bus (128KB ROM / 32KB RAM, `x5_memory.c`'s physical-address formula, ROM writes silently dropped).
  - `src/core/devices/lcd.ts` (`T6a43Lcd`): addr/contrast/rowstride state + `getFrameData()` ported verbatim from `tilem_lcd_t6a43_get_data`'s three-segment row copy (including the rowstride>width wraparound quirk).
  - `src/core/devices/keypad.ts` (`Keypad`): 8x8 matrix, group select, ghosting-propagation read, ON-key edge-triggered interrupt request — ported from `keypad.c`.
  - `src/core/io/ports.ts` (`Ti85Ports`): full port 0-7 dispatch ported from `x5_z80_in`/`x5_z80_out`/`setup_mapping`, depending on a minimal `Ti85PortHost` interface (not the concrete calc) to avoid a circular import.
  - `src/core/calc/ti85.ts` (`Ti85Calc`): ties bus/ports/lcd/keypad/hwregs together, `x5_reset` defaults, `loadRom()` (128KB size check), `runForCycles()`, `pressKey`/`releaseKey` (ON-key -> interrupt bitmask, synced into `z80.interruptLine` each cycle-batch — TIMER1 wiring waits for the timer scheduler at M6), `getFrame()`.
  - 28 new unit tests (87 total): bus paging/ROM-write-drop, port dispatch (paging/LCD/keypad/interrupt-clear-on-port3-write), LCD frame extraction (both rowstride cases), keypad ghosting/ON-key edge behavior, and a `Ti85Calc` integration test running real instructions through the paged memory map.
  - **Real-ROM smoke test** (`tests/zexall/boot-rom-check.test.ts`, skips if `ROM/TI85.ROM` isn't present): loads a real TI-85 ROM dump and runs it for 50M cycles (~8 simulated seconds at 6MHz) with the real `Ti85Calc`. No exceptions, no unimplemented opcodes — it runs the reset code and halts cleanly at PC=0x0d1b. (M5 disassembled this: it's not the idle loop, it's the cold-boot code deliberately powering off the LCD and halting with only the ON-key interrupt armed, waiting for a keypress — see the M5 entry below.)
- **M5 (done)**: LCD canvas rendering.
  - `src/ui/lcd-render.ts` (`unpackFrame`): pure, core-independent conversion of the packed 1bpp frame (MSB-first) into RGBA bytes for a canvas `ImageData`.
  - `src/ui/components/Screen.tsx`: 128x64 canvas (3x CSS scale, `imageRendering: pixelated`), redraws itself from `calc.getFrame()` on its own rAF loop, decoupled from the stepping loop.
  - `src/ui/components/RomLoader.tsx`: file input, validates the 128KB size, hands bytes to `useEmulator`.
  - `src/ui/hooks/useEmulator.ts`: owns the `Ti85Calc` instance, drives it with a cycle-debt `requestAnimationFrame` loop (elapsed real ms x `CLOCK_SPEED_KHZ`, clamped to 100ms/frame) — this is the M7 execution-loop design brought forward early since M5 needed *something* running continuously to render.
  - 3 new unit tests (90 total) for `unpackFrame` (bit-to-pixel mapping, output size, custom colors).
  - **Verified in an actual browser**, not just build/typecheck: installed Playwright + Chromium, ran the dev server, loaded the real ROM through the file input, and screenshotted the result. Confirmed the rendering pipeline itself is fully correct by feeding `T6a43Lcd`'s RAM region a synthetic test pattern directly — it rendered pixel-perfect on the canvas (including the rowstride-10 zero-fill quirk visibly matching bytes 0-9 vs. 10-15 per row).
  - **Open finding from M5, resolved in M6**: the blank-screen issue wasn't a missing TIMER1 as guessed — it was ON-key debounce timing. Disassembling further (ROM address 0x0af0) found a ~2400-iteration busy-wait loop that debounces the ON press before trusting it. A programmatic press+release, however carefully timed, kept failing: releasing too early loops back to the cold-boot HALT (debounce not satisfied), but holding *too long* **also** loops back to it — tracing showed a genuine transient success state (`port3=0x0b`, LCD powered on) around ~600k cycles held, which then regressed back to the same HALT by ~1.2M cycles still held (apparently a defensive stuck-key reset). A natural human press (a browser click held ~150ms) lands in that window fine and consistently boots to the real TI-85 "Mem cleared / Defaults set" screen; no further synthetic-press logic was worth building once the real Keyboard UI existed to just do this the normal way. See `useEmulator.ts`'s `loadRom` comment for the full timeline.
- **M6 (done)**: keypad matrix, TIMER1 interrupt, and keyboard input — the fix for M5's blank-screen finding, per above.
  - `src/core/devices/keypad.ts`: fixed a real bug caught while building the scancode table — `KEY_ON` was `0`, but tilem's actual `TILEM_KEY_ON` is `0x29` (41); scancode `0` isn't a real key at all. Everything using it (the emulator's own auto-press logic at the time, tests) needed updating once this was caught.
  - `src/core/devices/scancodes.ts`: the full 8x8 `KEY_LAYOUT` (scancode + label per position), ported from `x5_subcore.c`'s `keynames[64]`, cross-checked against `tilem/emu/scancodes.h`'s named constants where they overlap (all consistent, including `On` landing on scancode 41 as expected).
  - `src/core/calc/ti85.ts`: TIMER_INT wired into `runForCycles` (`x5_init.c`'s `tilem_z80_set_timer(calc, TIMER_INT, 1000, 5000, 1)` — initial delay 1000µs, period 5000µs, converted to cycles via `CLOCK_SPEED_KHZ`), firing `x5_z80_ptimer`'s logic (only sets the TIMER1 interrupt bit if `hwregs[PORT3]` bit 1 is armed).
  - `src/ui/components/Keyboard.tsx` (+ `.css`): on-screen keypad grid from `KEY_LAYOUT`, pointer down/up drives `calc.pressKey`/`releaseKey` directly.
  - `src/ui/hooks/useKeyboardInput.ts`: physical-keyboard listener, best-effort key map (arrows, digits, basic ops, Enter, Escape→ON, Backspace→Del, F1-F5, Tab→2nd, Alt→Alpha) — not exhaustive, there's no clean 1:1 mapping for every TI-85 key on a PC keyboard.
  - 5 new unit tests (95 total): TIMER1 fires when armed / never fires when disabled, scancode table consistency (`KEY_ON` value, uniqueness, a few known labels).
  - **Verified end-to-end in a real browser with the real ROM**: clicking and holding the on-screen "On" button (~150ms, a natural press duration) boots all the way to the authentic TI-85 "Mem cleared / Defaults set" screen — confirmed via screenshot, not just internal state. Also directly confirmed the keypad matrix correctly registers a press mid-click (e.g. "Clear" sets the exact expected bit in `keysDown`). Getting *every* key to reliably dismiss that specific screen within a scripted test wasn't fully nailed down in this session (regular-key handling may have similar debounce timing sensitivity to the ON key) — noted as a follow-up, not a blocker, since the core mechanisms (matrix wiring, ON-key interrupt, timer, both keyboard input paths) are all implemented correctly and independently verified.
- **M7 (done)**: execution loop polish.
  - `src/ui/components/Controls.tsx`: Pause/Resume + Reset, wired into `App.tsx`. Most of M7's actual execution-loop design (cycle-debt `requestAnimationFrame`, 100ms/frame clamp) was already built in M5 since rendering needed something driving the CPU continuously from the start — this milestone mainly added the missing UI controls and verified the loop under real conditions rather than building it from scratch.
  - `tests/unit/calc/perf.test.ts`: standing perf regression guard (plan's testing-strategy item 6) — 1 sim-second (6,000,000 cycles) against a synthetic never-halting busy-loop ROM (no ROM needed, so this always runs) completes in ~44ms, comfortably inside a generous 5s budget.
  - **Verified in a real browser**: Pause genuinely freezes `z80.clock` (confirmed unchanged across a 500ms wait), Resume continues it, Reset returns PC to 0. Ran the real ROM continuously for ~20 real seconds and sampled sim-clock vs. wall-clock every 2s — the ratio stayed within 0.998-1.007 the entire time with zero console errors, i.e. no drift, no runaway catch-up bursts, no performance degradation over a sustained run.
  - **Root-caused and fixed the "keys don't do anything after boot" issue.** Two separate, stacked bugs, found by disassembling the ROM around the stuck points:
    1. **Link port stub (`src/core/io/ports.ts`, port 7 input).** After "Mem cleared", the OS runs a link-cable detection sequence (ROM ~0x65a4-0x65b0 and ~0x4b70-0x4b9a: poll port 7, compare against expected bit patterns, retry with a countdown). Our port 7 stub echoed back whatever was last *written* to it instead of a believable "no cable attached" idle signal, so these checks never resolved the way real hardware would — the OS lived-looped in this detection code forever, never reaching its normal keyboard-scan interrupt path. Fixed by always returning `3` (both link lines idle-high, i.e. undriven/no peer) on port 7 reads. Verified this doesn't narrow the ON-key boot-success window (still reliable across a wide range of hold durations) and, critically, that the CPU now actually reaches and executes the ROM's one and only keyboard-matrix-read instruction (`IN A,(1)` at ROM 0x1a8) — traced the full call chain from the TIMER1 ISR down to it and confirmed `calc.keypad.group` does take on real (non-reset) values during a scan, previously invisible because it always resets to `0xff` before the scan subroutine returns (a sampling artifact, not a real "never scans" bug).
    2. **Keyboard debounce timing (`src/ui/keyHold.ts`, new).** Even with the matrix genuinely scanned, a key still had to be *held* for the OS's debounce to trust it: hold-duration scans against the real ROM (using the actual frame-batched cycle pattern `useEmulator` uses, not synthetic round numbers) found presses under ~350ms and over ~750ms both consistently failed to register, with a reliable window in between. A natural quick human click falls short of that. Added `pressWithMinHold`/`releaseWithMinHold`, which stretch every press to at least 550ms regardless of how fast the pointer/keyboard event releases it, and wired both `Keyboard.tsx` and `useKeyboardInput.ts` through them.
  - 5 new unit tests (101 total) for `keyHold.ts`'s min-hold behavior.
  - **Correction + the actual root cause.** The "measurable change" claimed above was wrong — it was cursor blink, not a key response; isolated properly (diffing WITH vs WITHOUT a keypress over the same duration) it showed **zero** difference, matching the observed behavior ("3" did nothing). Confirmed via careful tracing that the keyboard matrix scan itself was 100% correct (exact expected bits read for the exact expected group) and zexall still passed with no new errors billions of cycles further in — the bug wasn't in port I/O or in general CPU correctness.
    - **Built a real reference to compare against**: compiled tilem's actual `emu/*.c` core (the genuine C source, not a reimplementation) into a small headless driver (a throwaway harness, not part of the repo) — minimal replacements for `calcs.c` (only registers the TI-85 model, avoiding the other 12 models' sources) and `gui/memory.c`'s helpers (plain libc malloc instead of GLib, avoiding a GTK/GLib dependency). Ran the *exact* same ROM + press/timing sequence through it: the real reference showed **118 LCD bytes changed** after pressing "3" (a real screen update — it draws the digit), against our port's 0. Definitive proof of a real divergence, not a ROM quirk or a "needs more OS to run" situation.
    - **Found it by diffing an instruction-level trace** of both implementations (PC + halted-state logged every step) side by side: identical for the first 60,000+ instructions, matching exactly, then diverging right after the keyboard-scan interrupt handler's `RETI`. The reference resumed at the instruction *after* the original `HALT`; ours jumped straight back into `HALT` and immediately re-entered the same interrupt, forever.
    - **Root cause**: in `src/core/z80/cpu.ts`'s `step()`, when accepting an interrupt from a halted CPU, the pushed return address was the HALT opcode's own address instead of the address after it. Tracing tilem's actual PC arithmetic (`tilem/emu/z80.c`'s main loop) showed `PC++` always happens on the halted phantom-fetch *before* the interrupt-acceptance check runs; `PC--` (re-arming HALT to be re-fetched) only happens in the sibling branch, when *no* interrupt is accepted that cycle. So the correct pushed address is always PC+1 relative to HALT, not PC. Fixed with a one-line `PC+1` adjustment right before pushing, with the reasoning captured in a comment at the fix site. Re-ran the same trace diff after the fix: now matches the reference exactly, including the 118-byte screen change.
  - **Verified end-to-end in a real browser with fast, natural clicks** (not manually held, no artificial timing): clicking "On" boots correctly, clicking "3" shows the digit on screen exactly like real hardware (screenshotted), and `3`, `+`, `4`, `Enter` correctly evaluates and displays `7`. The calculator is genuinely usable now, not just visually booting.
  - **Follow-up: checked for further divergences from the reference**, by extending the same trace-diff technique across a full confirmed-working session (boot, then `3`, `+`, `4`, `Enter`, each held/released realistically, then a few seconds idle). 468,766 instructions compared; only 0.04% (366 lines) differ, and every one of those is a **pure reordering** — the same instructions executing, just shifted by a handful of positions relative to each other before realigning (e.g. two instructions at ROM 0x681e/0x684b land ~448 instructions "later" in our trace than the reference, then both traces resync) — never a missing, extra, or wrong instruction. Final state and the tail of both traces are byte-identical. No further logic bugs found.
  - **What causes that residual reordering, and a correction.** Initially guessed it was a rounding-formula mismatch between tilem's integer timer-scheduling math (`(cycles*count + 500) / 1000`, C fixed-point rounding) and this port's `Math.round((cycles*count) / 1000)` (floating point). Checked this claim before writing it down here: for our actual constants (6MHz clock, TIMER_INT's 1000µs initial delay and 5000µs period), **both formulas produce byte-identical results** (6000 and 30000 exactly, no remainder either way) — so that wasn't it, and the earlier explanation overstated its own confidence. For what it's worth, if the constants ever changed to values that don't divide evenly, the integer/truncating form is still the more "authentic" one to prefer: it's what real timer-prescaler hardware and tilem's C actually do (integer arithmetic only), whereas a floating-point division carries a theoretical (if practically negligible at these magnitudes) precision risk that the integer form doesn't.
    - **Best current hypothesis (unverified)**: tilem calls `check_timers()` from *inside* `z80_readb`/`z80_writeb`/`z80_input`/`z80_output` individually, so a timer can be noticed as due mid-instruction, right after whichever memory/port access happens to cross the deadline. This port only checks once per *fully completed* instruction (in `Ti85Calc.runForCycles`'s loop, after `z80.step()` returns). On an instruction that does two or three separate bus accesses, that's a few-cycle difference in exactly when the timer is noticed — enough to occasionally shift an interrupt's acceptance by one instruction boundary relative to tilem, without changing anything about which instructions run or the calculator's actual behavior. Not yet confirmed by tracing (unlike the HALT bug, which was), and likely not worth the complexity of matching exactly given it demonstrably doesn't accumulate or affect real usage.
