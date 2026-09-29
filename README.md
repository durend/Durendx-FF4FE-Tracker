# FF4 Free Enterprise Tracker

A comprehensive tracker for Final Fantasy IV Free Enterprise randomizer with full manual and auto-tracking support.

![FF4FE Banner](images/ffivfebanner.png)

## Features

### Core Functionality
- **Manual Tracking**: Click-to-track interface for all tracker elements
- **Auto-Tracking**: Real-time memory reading via USB2SNES/QUsb2Snes protocol
- **Dual Layout Modes**: Switch between horizontal and vertical layouts
- **Comprehensive Flag Support**: Full support for FF4FE flags including Knofree variants, Cnoearned, and more

### Tracking Sections
- **Key Items** (18 items): Track all progression items
- **Bosses** (35 bosses): Monitor boss defeats
- **Objectives** (100+ objectives): Quest, boss, and character objectives
- **Locations**: Key item locations, character locations, and town checks
- **Current Party**: Live party display with character forms (Cecil DK/Paladin, Rydia Kid/Adult)
- **Trapped Chests**: Track dangerous chest locations

### Galeswift Fork Support
- Boss Collector objectives
- Gold Hunter objectives
- Objective Groups (Alpha groups A-E) with progressive rewards
- Dark Matter hunt, Key Item hunt and External objectives
- Seed Notes for Ctreasure, Kstart, gated/hard-required objectives and shop flags
- Tested against Galeswift v4.7.0

## Quick Start

### Manual Tracking
1. Download the [latest release](https://github.com/durend/Durendx-FF4FE-Tracker/releases)
2. Extract the files
3. Open `launcher.html` in your web browser
4. Enter your flag string
5. Click "Launch Tracker"
6. Click items/bosses/locations as you find them

### Auto-Tracking Setup

#### Required Software
- [QUsb2Snes](https://github.com/Skarsnik/QUsb2snes/releases) - Bridge software for memory reading

#### Supported Emulators
- **BizHawk** (with Lua bridge)
- **RetroArch** (with network commands enabled)
- **Snes9x-rr** (with Lua support)
- **snes9x-emunwa** (built-in support)

#### Supported Hardware
- **SD2SNES / FXPak Pro** with network support

#### Setup Instructions

##### Windows

1. **Install QUsb2Snes**
   - Download from [GitHub Releases](https://github.com/Skarsnik/QUsb2snes/releases)
   - Run QUsb2Snes - it will start a WebSocket server on port 8080

2. **Configure Your Emulator**
   - **BizHawk**: Install [Emulator Network Access plugin](https://github.com/Skarsnik/Bizhawk-nwa-tool/releases) to `ExternalTools` folder, then enable via `Tools→External Tools` menu
   - **RetroArch**: Enable network commands in settings
   - **snes9x-emunwa**: No configuration needed

3. **Start the Tracker**
   - Open `launcher.html`
   - Enter your flag string
   - Check "Enable Auto-Tracking"
   - Set port to `8080` (default)
   - Click "Launch Tracker"

4. **Load Your ROM**
   - Start your FF4 Free Enterprise ROM in the emulator
   - The tracker will automatically connect and sync

##### Linux

1. **Install QUsb2Snes**
   - **Arch Linux**: Install from AUR: `yay -S qusb2snes` or `paru -S qusb2snes`
   - **Other Distros**: Download from [GitHub Releases](https://github.com/Skarsnik/QUsb2snes/releases) or build from source
   - Run QUsb2Snes - it will start a WebSocket server on port 8080

2. **Choose Your Emulator**

   **Option A: BizHawk (Native Linux Build)**
   - **Arch Linux**: Install from AUR: `yay -S bizhawk-bin` or `paru -S bizhawk-bin`
   - **Other Distros**: Download `bizhawk-monort` from [BizHawk Releases](https://github.com/TASEmulators/BizHawk/releases)
   - Requirements: Mono (complete), OpenAL, Lua 5.4, glibc, lsb_release
   - Run with: `./EmuHawkMono.sh`
   - Install [Emulator Network Access plugin](https://github.com/Skarsnik/Bizhawk-nwa-tool/releases) to `ExternalTools` folder
   - Enable plugin via `Tools→External Tools` menu in BizHawk
   - **Note**: Network functionality for QUsb2Snes has not been extensively tested on Linux builds

   **Option B: RetroArch (Recommended)**
   - Edit RetroArch config: `~/.config/retroarch/retroarch.cfg`
   - Set: `network_cmd_enable = "true"`
   - Save and restart RetroArch
   - In QUsb2Snes, activate the RetroArch device from the devices menu
   - **Use bsnes-mercury core (recommended)** or Snes9x core
   - bsnes-mercury provides better ROM data access for auto-tracking

3. **Start the Tracker**
   - Open `launcher.html` in Firefox, Chrome, or any browser
   - Enter your flag string
   - Check "Enable Auto-Tracking"
   - Set port to `8080` (default)
   - Click "Launch Tracker"

4. **Load Your ROM**
   - Start your FF4 Free Enterprise ROM in your chosen emulator
   - The tracker will automatically connect and sync

**Linux Notes:**
- **BizHawk Linux builds are available** but are considered experimental. Network functionality may vary. RetroArch is still recommended for most users due to proven QUsb2Snes compatibility.
- Config files stored in: `$HOME/.config/skarsnik.nyo.fr/QUsb2Snes.conf`
- Logs stored in: `$HOME/.local/share/QUsb2Snes`
- If you have serial device issues, you may need to adjust TTY settings (see QUsb2Snes documentation)

## Technical Details

- **Protocol**: WebSocket communication via USB2SNES protocol
- **Polling Rate**: 100ms memory read interval
- **Memory Addresses**: Reads SNES WRAM at `0x7E0000-0x7FFFFF`
- **Protection Logic**: Smart filtering prevents data loss during save browsing
- **Party Persistence**: Maintains party slot assignments across saves

## Layout Modes

### Horizontal Mode (Default)
- Key Items and Current Party on the left
- Boss Tracker in the middle
- Locations, Characters, and Towns on the right
- Objectives below

### Vertical Mode
- Compact single-column layout
- Key Items and Objectives stacked
- Boss Tracker below
- Locations and Characters at bottom

Toggle between modes using the launcher or URL parameter `v=1`.

## Tracker Sections Explained

### Key Items
Track the 18 key progression items (Package, SandRuby, Baron Key, etc.)

### Bosses
35 boss encounters from Mist Dragon to the optional superbosses

### Objectives
100+ objectives based on your flag settings:
- Quest objectives (complete dungeons, defeat specific bosses)
- Character objectives (recruit specific characters)
- Boss objectives (defeat boss groups)
- Special objectives (Boss Collector, Gold Hunter, Objective Groups)

### Locations
- **Key Item Locations**: 29 key item check locations
- **Character Locations**: Where characters can be recruited
- **Town Locations**: Town-specific checks

### Current Party
Displays your active party with character portraits. Shows character forms:
- Cecil: Dark Knight / Paladin
- Rydia: Kid / Adult

## Flag Support

Comprehensive support for FF4FE flags including:
- **K Flags**: Kmain, Ksummon, Kmoon, Ktrap, Knofree (and variants)
- **C Flags**: Cstandard, Crelaxed, Cnoearned, Cnofree
- **O Flags**: All objective types and requirements
- **Special Modes**: Mystery seeds, Boss Collector, Gold Hunter
- **Alpha Groups**: Objective groups A-E with progressive rewards

## Bug Fixes (v1.0.0)

- Fixed Toroia Castle location visibility with Knofree flags
- Fixed vertical mode disable handlers for boss tracker and location tracking
- Fixed character cleanup when switching save files
- Fixed manual tracking stability (locations no longer flicker)
- Fixed ApplyChecks initialization on page load

## Changes (v1.01)

- Fixed Cnoearned/Cnofree character location visibility bug - character locations now properly stay hidden when tracker is reloaded during auto-tracking

## Changes (v1.02)

- Added boss name tooltips - hover over any boss icon to see its full name

## Changes (v1.03)

Updated and tested for **Galeswift v4.7.0** (all 61 official presets plus
fork-specific flag combinations load cleanly).

**New Galeswift flag support**
- `Omode:dkmatterN` (Dark Matter hunt counter), `Omode:kiN` (Key Item hunt,
  counted automatically from the Key Items panel), `Omode:external`
- New **Seed Notes** panel for `Ctreasure`, `Kstart`, `Ogated`, `Ohardreq`
  and shop flags (`Sprice`, `Spricey`, `Smixed`, `Ssame`, `Ssingles`)
- Multiple random objective pools (`Orandom2:`, `Orandom3:`) and `tough_quest`

**New features**
- **XP modifier** on the left of the Key Items header (e.g. `XP:1.5x`), based
  on key items gained and the seed's X flags: x2 at 10 key items (unless
  `Xnokeybonus`), `Xcrystalbonus`, `Xkicheckbonus:N` and `Xobjectivebonus:N`.
  Hover it to see which bonuses apply
- **Auto boss tracking**: with auto-tracking on, each boss is marked defeated
  in the Boss Tracker as soon as you win the fight (works with boss rando and
  `Balt:gauntlet`). New **Auto-Track Bosses** toggle in the launcher (on by
  default). Bosses beaten before connecting still need a click
- **Pass auto-tracks** (read from your inventory, since the game keeps no
  "found" flag for it), however you get it: `Pkey`, shop, chest or `Kstart:pass`
- New **Dwarf Castle [Cid]** location for the `Knofree:dwarf` free key item
  (the existing one is now labelled **Dwarf Castle [Luca]**)

**Fixes**
- Fixed the tracker failing to load for any seed using `Pshop` (e.g. the
  Classic Intermediate and Supermarket Sweep presets)
- Fixed fixed objectives (`O1:quest_forge`, `Omode:fiends`, classic modes,
  specific boss/character objectives) not appearing in the Objectives panel;
  random objectives now show as placeholders
- Fixed `Omode:` seeds ignoring `win:game` / `req:` settings
- Fixed the Boss Collector / Gold Hunter / Dark Matter +/- buttons throwing
  errors
- Fixed objective slots 10 and above losing their names
- Gold Hunter now shows the correct amount (`goldhunter100` = 100,000 GP),
  counted in 1k steps
- Auto-tracking: ROM seed metadata is now read in full (it was cut off at
  1 KB, which broke objective reading on seeds with long flag strings or
  many objectives)
- Auto-tracking: Gold Hunter, Dark Matter and Key Item Hunt objectives now
  mark complete when turned in (they previously never completed);
  "Obtain 1 key item" is recognized
- Auto-tracking: character recruit locations now track reliably. They
  previously didn't track at all on `Cnoearned` seeds, Mysidia/Zot (two
  characters each) could be missed, and spots emptied by the flag set
  (`Cnofree`, `Cnoearned`, and now also `Ctreasure:free` / `Ctreasure:earned`)
  could show up or appear checked
- Auto-tracking: key item locations no longer reappear or show as checked
  when the flag set leaves them empty (e.g. Edward/Toroia under `Knofree`,
  Rydia's Mom under `Knofree:dwarf`)
- Auto-tracking: locations you check by hand are no longer undone by the
  tracker; loading an earlier save un-checks only what the game had marked
- Auto-tracking: the Current Party panel now shows duplicate characters (e.g.
  two Paloms) and no longer keeps a stale character after saving
- Clicking Mist Dragon in the Boss Tracker now opens Rydia's Mom under
  `Knofree` (the click previously only changed the icon)

## Credits

- **Original Tracker**: Created by [Dunka](https://github.com/Dunkalunk)
- **Enhanced Version**: Maintained and enhanced by Durendx
- **Development Assistance**: Claude Code
- **Galeswift Fork Support**: Objective system enhancements

## License

This project is open source and available for community use.

## Support

For issues, questions, or feature requests:
- Open an issue on [GitHub](https://github.com/durend/Durendx-FF4FE-Tracker/issues)
- Join the FF4 Free Enterprise community

## Links

- **FF4 Free Enterprise**: [https://ff4fe.com/](https://ff4fe.com/)
- **Galeswift Fork**: Enhanced FE version with additional features
- **QUsb2Snes**: [https://github.com/Skarsnik/QUsb2snes](https://github.com/Skarsnik/QUsb2snes)

---

**Version**: 1.03
**Last Updated**: September 2026
