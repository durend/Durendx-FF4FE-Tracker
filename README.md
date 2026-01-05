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

## Quick Start

### Manual Tracking
1. Download the [latest release](https://github.com/durend/Durendx-s-FF4FE-Tracker/releases)
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

1. **Install QUsb2Snes**
   - Download and run QUsb2Snes
   - It will start a WebSocket server on port 8080

2. **Configure Your Emulator**
   - **BizHawk**: Load the QUsb2Snes Lua script
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

## Credits

- **Original Tracker**: Created by [Dunka](https://github.com/Dunkalunk)
- **Enhanced Version**: Maintained and enhanced by Durendx
- **Development Assistance**: Claude Code
- **Galeswift Fork Support**: Objective system enhancements

## License

This project is open source and available for community use.

## Support

For issues, questions, or feature requests:
- Open an issue on [GitHub](https://github.com/durend/Durendx-s-FF4FE-Tracker/issues)
- Join the FF4 Free Enterprise community

## Links

- **FF4 Free Enterprise**: [https://ff4fe.com/](https://ff4fe.com/)
- **Galeswift Fork**: Enhanced FE version with additional features
- **QUsb2Snes**: [https://github.com/Skarsnik/QUsb2snes](https://github.com/Skarsnik/QUsb2snes)

---

**Version**: 1.0.0
**Last Updated**: January 2026
