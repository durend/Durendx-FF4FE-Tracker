# FFIV Free Enterprise Tracker - Galeswift Edition

## Version: 2.3.03-Gale

This is an enhanced version of the FFIV Free Enterprise Tracker updated to support Galeswift fork features.

## What's New

### New Objective Types

**Boss Collector**
- Track the number of bosses defeated for the Boss Collector objective
- Use the up/down arrows to increment/decrement the boss count (0-99)
- Objective format: `Omode:bosscollector`

**Gold Hunter**
- Track GP collected for the Gold Hunter objective
- Use the up/down arrows to increment/decrement by 1000 GP
- Objective format: `Omode:goldhunter`

**Alpha Objective Groups (NEW!)**
- Support for grouped objectives with group-based rewards (Groups A-E)
- Each group can have multiple objectives with different reward tiers
- Syntax: `OA1:quest_name/2:boss_name/do_all:reward/do_2:reward`
- Progress tracking for each group
- Automatic display of group objectives and rewards

### Features Supported

1. **New Objectives Display**
   - Boss Collector counter with up/down arrows
   - Gold Hunter counter with up/down arrows (in GP)
   - Both objectives show/hide automatically based on flags

2. **Mystery Mode Support**
   - Added Boss Collector and Gold Hunter checkboxes to Mystery Flags modal
   - Allows configuration of new objective types in mystery seeds

3. **Version Information**
   - Updated launcher to show "V2.3.03-Gale"
   - Indicates support for "4.6.X + Galeswift"

4. **Objective Groups (Alpha Groups)**
   - Displays all active objective groups (A through E)
   - Shows progress tracking for each group (e.g., "2/4 completed")
   - Displays all rewards with their requirements
   - Lists all objectives in each group with checkmarks for completion

## Galeswift v4.6.4 / v4.7.0 Support (tracker v1.03)

Now supported:
- **Omode:dkmatterN**: Dark Matter hunt counter (5-45)
- **Omode:kiN**: Key Item hunt, counted automatically from the Key Items panel
- **Omode:external**: External objective (manual toggle)
- **Omode:goldhunterN**: amount shown correctly in thousands of GP
- **Additional random objective pools**: `Orandom2:` / `Orandom3:` and `tough_quest`
- **Seed Notes panel**: Ctreasure, Kstart, Ogated, Ohardreq, Sprice, Spricey, Smixed, Ssame, Ssingles

Galeswift v4.7.0 added no flags that change what the tracker needs to show
(new flags such as `Cstatscap`, `Zdrain`, `-infarrows`, `-warpitem`,
`-t8scramble` and `-singleuse` are accepted and ignored).

Still not implemented:
- Pre-checking the starting key item from `Kstart` (it is shown in Seed Notes instead)
- Characters shown in specific treasure chests for `Ctreasure`
- Binary (`b...`/`c...`) flag strings: paste the text form of the flags

## Usage

1. Launch the tracker from [launcher.html](launcher.html)
2. Paste your Galeswift seed flags (supports both vanilla FE and Galeswift flags)
3. Configure optional settings
4. Click "LAUNCH TRACKER"

### Example Flags with New Objectives

```
Omode:bosscollector O1:boss_bahamut O2:boss_cpu Oreq:2 Kmain Pkey Cstandard
```
This seed would show the Boss Collector objective requiring you to defeat a certain number of bosses.

```
Omode:goldhunter Oreq:1 Kmain Pkey Cstandard
```
This seed would show the Gold Hunter objective requiring you to collect a certain amount of gold.

```
OA1:quest_cavebahamut/2:quest_traderat/3:boss_bahamut/4:boss_wyvern/do_all:game
OB1:collect_boss1/2:collect_boss2/3:collect_boss5/do_1:siren/do_2:siren/do_all:siren
Kmain Pkey Cstandard
```
This seed would show two objective groups:
- **Group A**: Complete all 4 objectives to win the game
- **Group B**: Progressive rewards - complete 1 for a siren, complete 2 for another siren, complete all for another siren

## Compatibility

- **Base FE 4.6.X**: Fully compatible
- **Galeswift Fork**: Supports new objective types
- **Auto-tracking**: Compatible with USB2SNES/QUsb2Snes

## Technical Changes

### Modified Files

- `tracker.html`:
  - Added Boss Collector and Gold Hunter HTML elements
  - Added Objective Groups section with divs for groups A-E
- `scripts/track.js`:
  - Added `bosscount` and `goldcount` variables
  - Added `obosscollector` and `ogoldhunter` mode flags
  - Added `BossTicker()` and `GoldTicker()` functions
  - Added flag parsing for BOSSCOLLECTOR and GOLDHUNTER modes
  - Added `objectiveGroups` data structure for alpha groups
  - Added alpha group flag parsing (OA, OB, OC, OD, OE)
  - Added `displayObjectiveGroups()` function
  - Added display logic for new objectives
- `index.html`: Updated version string and description

### Unchanged Files

All original tracker functionality remains intact:
- Character tracking
- Key item tracking
- Location tracking
- Shop/town tracking
- Trapped chest tracking
- Standard objectives
- Auto-tracking support

## Known Limitations

1. Boss Collector and Gold Hunter objectives use placeholder indices (objective slot 3)
2. Auto-tracking may not automatically detect boss kills or gold for these objectives
3. Manual tracking required using the up/down arrow buttons
4. Objective groups currently display objectives but do not have click-to-complete functionality yet
5. Objective group progress is tracked but not automatically updated - manual tracking needed

## Credits

- **Original Tracker**: BigDunka
- **Galeswift Fork**: Galeswift
- **Galeswift Tracker Updates**: Durendx
- **FE Base**: HungryTenor, b0ardface, and the FE development team

## License

Same as original tracker (MIT License)
