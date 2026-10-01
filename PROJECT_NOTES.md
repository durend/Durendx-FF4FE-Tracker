# Tracker v1.03 — Project Notes

Working notes for the FF4 Free Enterprise tracker, v1.03 (**released 2026-09-29**). Read this first when resuming work on this folder.

## Status (2026-09-30): RELEASED
- **v1.03.2 hotfix published** (main @ aa2b513, tag v1.03.2, https://github.com/durend/Durendx-FF4FE-Tracker/releases/tag/v1.03.2): fixed four pre-existing, version-independent dead-code/logic bugs, all found while building separate Alpha 5.0 support in `Tracker v1.04 Alpha5` (a copy of this release) and ported back here:
  - `Xzonkbonus:N` parsed but never applied in `updateXPModifier()` - dead code
  - `-Pushbtojump` (an April Fools joke mode, confirmed via the live generator's own description to not affect item placement) mistakenly used as a bypass on ~12 separate prerequisite gates in `ApplyChecks()` - e.g. Tower of Zot/Baron Castle/Magnes Cave could show available with no prerequisite key item
  - `Ksummon`/`Kmoon`-gated locations (Baron Odin, Fey Asura/Leviathan, Sylph Cave, Bahamut, all 5 Lunar spots) permanently force-hidden on any seed without those flags (most seeds), silently blocking the tracker's own correct unlock logic for the rest of the session
  - `Cnogiant` parsed but never applied - Giant of Bab-il's character spot showed as available regardless
  - Also fixed `..\Kyuuden inspired tracker\tests\xptest.py`'s own pre-existing assertion-format bug (`"XP:1x"` vs a stale `"XP x1"`) while in there
  - Full regression suite clean: romtest, kitest, chartest, xptest, harness (69 presets), launchtest, partytest, bosstest, persisttest
- **v1.03.1 hotfix published** (main @ 753814d, tag v1.03.1): usb2snes.js send() now queues requests and reassembles chunked GetAddress replies. This fixed missed bosses (Dwarf Castle) and the main hardware flicker cause. Tests: usbtest.py, e2etest.py
- **v1.03 is published**: https://github.com/durend/Durendx-FF4FE-Tracker/releases/tag/v1.03 (tag `v1.03`, `main` @ 1c1149f, asset `Durendx-FF4FE-Tracker-v1.03.zip`)
- Tested live on BizHawk and on real hardware (FXPak/SD2SNES) by the user; all headless suites pass (tests live in `..\Kyuuden inspired tracker\tests\`: harness, romtest, launchtest, chartest, kitest, partytest, bosstest, persisttest, xptest, usbtest, e2etest; pass the tracker folder path as arg 1)
- **Hardware flicker:** the main cause (usb2snes.js mixing up overlapping/chunked replies) was fixed in v1.03.1. Read filters also remain (block bytes need 3 matching reads, party/Pass 2). If flicker is still reported, the next step is the in-tracker flicker log (Debug Log launcher toggle, F9 marker, F10 download), designed but on hold
- **User preference:** no AI references in commits, README or release notes (no Co-Authored-By trailers)
- Removed the AI lines from the v1.0.0 / v1.0.1 release notes (2026-09-29). 8 early commits (Jan 2026) still carry Co-Authored-By trailers; rewriting them would need a force-push to main and hasn't been done

## Architecture (quick reference)
- `launcher.html` + `scripts/launcher.js` — flag string entry, builds the `tracker.html?...` URL
- `tracker.html` — UI and inline JS: objectives rendering, Seed Notes panel, counters
- `scripts/track.js` — **hand-written flag parser** that fills the global `modeflags` object, plus tracking state and click handlers
- `scripts/usb2snes.js`, `network.js`, `tracking_interface.js` — QUsb2Snes auto-tracking (polls every 100 ms)
- `scripts/flags_v5.js` — Alpha 5.0 parser. **Present but NOT loaded** in the v1.0x line (Tracker V5 is the separate branch that uses it)
- Runs from `file://`, so no web server is needed

## Only files changed vs v1.02
- `tracker.html`
- `scripts/track.js`

## v1.03 changes (Galeswift v4.6.4 flag support)
### Parser (`scripts/track.js`)
- New `modeflags` fields: `odarkmattercount`, `oki`, `okicount`, `oexternal`, `ogated[]`, `ohardreq[]`, `objectiveSlotNames{}`, `ctreasure`, `kstart[]`, `ssame`, `ssingles`, `smixed`, `sprice`, `spricey[]`
- `Omode:dkmatterN` — Dark Matter count read from the flag
- `Omode:kiN` — Key Item Hunter
- `Omode:external` — meta objective, manual toggle only
- `Ogated:N` / `Ohardreq:N` — slot numbers, resolved to names via `objectiveSlotNames`
- `Kstart:<item>` — starting key item(s)
- `Ctreasure:free|earned|unsafe|relaxed`
- `Ssame`, `Ssingles`, `Smixed:shaken|stirred`, `Sprice:NN`, `Spricey:<category>`
- Null-safe `getParameterByName('a')` check
- Dark Matter ticker cap raised from 30 to 45

### UI (`tracker.html`)
- New generated objectives: "Collect N Dark Matter" (+/- counter via `DMTicker`), "Obtain N Key Items" (auto-counted via `countCheckedKeyItems()`), "Complete External Objective"
- New **Seed Notes** panel (`#seednotesdiv` / `#seednoteslist`), built by `updateSeedNotes()` and hidden when no notes apply

## Known loose ends / TODO
- [x] README bumped to 1.03 with changelog (2026-09-28)
- [x] v1.03 zip built (`..\Durendx-FF4FE-Tracker-v1.03.zip`); the old v1.02 zip in this folder is untracked leftover
- [x] New flags tested with all v4.7.0 preset flag strings (headless)
- [x] Released v1.03 (2026-09-29)
- [x] Live emulator + hardware test
- [ ] Check that the Key Items objective counter refreshes when key items are clicked (it only recalculates when the objectives list re-renders)

## Session log
- **2026-09-29** — v1.03.1 hotfix: usb2snes.js request queue + chunked-reply reassembly (fixed the missed Dwarf Castle bosses on FXPak and most hardware flicker). Released; Discord post written by the user
- **2026-09-29** — Added the XP modifier, auto boss tracking, per-seed saved progress, Pass/Cid tracking, the location/party fixes and read filtering. Released v1.03
- **2026-09-28** — Committed the old 1.03 work; ported and tested the v4.7.0 fixes; bumped version strings/cache-busters; wrote the README changelog and updated GALESWIFT_CHANGES.md
- **2026-09-28** — Reviewed v1.02 vs v1.03 diff; created this notes file. Conversation notes: `e:\VS Code repository\Conversation Notes\2026-09-28 Tracker v1.03.md`
