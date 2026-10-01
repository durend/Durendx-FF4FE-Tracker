function tracking_interface() {
  let timerID;
  let module = {};
  let partyUpdateCounter = 0; // Counter to throttle party updates
  let seedCheckCounter = 0; // Counter to throttle the seed re-check
  let xpPollCounter = 0;
  let lastPartyState = ''; // Track previous party composition to detect changes
  const PARTY_STABLE_READS = 2; // consecutive identical reads needed before a party change is shown
  let pendingPartyState = null;
  let pendingPartyReads = 0;
  let lastHookRoute = null; // Track previous hook route state to detect changes

  module.network = null;
  module.auto_update_func = () => {};

  module.status = status
  function status() {
    if (module.network && module.network.device && module.network.device.attached > -1) {
         return true;
    }
    return false;
  }

  module.getConnected = getConnected
  function getConnected(port, errorhandler) {
    port = port || 8080;
    console.log;
    module.network = new create_network(console, port, errorhandler, isReact=false);
    module.network.onConnect().then(
        () => { module.get_objectives_from_metadata(); })
      .then(
        () => { this.timerID = setInterval( module.keep_updating_kis, 100); },
        () => { console.log("Failure on connection"); }
    );
  }

  module.disconnect = disconnect
  function disconnect() {
    if (this.timerID) {
      clearInterval(timerID);
    }
    module.network.disconnect();
  }

  module.auto_set_live_objectives = (values) => {}
  module.set_live_objectives = set_live_objectives;
  function set_live_objectives(){
    module.auto_set_live_objectives(module.objectives);
  }

  module.objectives = null;
  module.objectiveTargets = null; // parsed {type, target} per objective, index-aligned with module.objectives
  module.objectiveProgress = null; // raw live progress byte per objective, updated every poll (see keep_updating_kis)
  module.flags = null; // WARNING: Flags will be <hidden> on a mystery seed
  module.get_objectives_from_metadata = get_objectives_from_metadata;
  // Adapts the legacy usb2snes.js/network.js connection (module.network.snes)
  // to the small readRom(offset, length) interface rom-metadata.js expects,
  // so the actual two-stage read (fixes the old fixed-0x400-byte truncation
  // bug) lives in one place instead of being duplicated here.
  async function readRomViaLegacyClient(offset, length) {
    const event = await module.network.snes.send(JSON.stringify({
      Opcode: 'GetAddress',
      Space: 'SNES',
      Operands: [offset.toString(16), length.toString(16)],
    }));
    return new Uint8Array(await event.data.arrayBuffer());
  }

  // Alpha 5.0 (meta.version like "v5.0.0-a.3") embeds `objectives` as nested
  // ObjectiveGroups instead of v4.x/Galeswift's flat description-string array
  // - see objectives-v5.js for the real shape (ported from a live actively-
  // maintained tracker's source, verified against a real dropped-in v5 ROM).
  module.objectiveGroupsV5 = null; // raw {key,name,tasks,rewards}[] for a future richer UI
  module.objectiveTasksV5 = null;  // full flattened list, including isComputed group-refs

  // Objectives__Progress base offset (relative to $7E1500) for the current
  // seed's polled-task array. v4.x/Galeswift: $7E1520 (rel 0x20), unchanged.
  // Alpha 5.0: $7E1530 (rel 0x30) - confirmed 2026-09-29 by live-polling a
  // real v5.0.0-a.3 seed (BizHawk + QUsb2Snes) while completing every polled
  // task in a known order and watching which byte flipped: all 6 tasks in
  // that seed (tradepan/kaipoinn/traderat/giant/monsterqueen/forge) landed
  // at exactly base+polledIndex with base=0x30, 6-for-6, no exceptions.
  // $7E1520-152F appears to be a separate group/reward-status block (e.g. a
  // reward-granted flag was observed at rel 0x28) - not more polled tasks.
  const OBJECTIVE_PROGRESS_BASE_V4 = 0x20;
  const OBJECTIVE_PROGRESS_BASE_V5 = 0x30;
  module.objectiveProgressBase = OBJECTIVE_PROGRESS_BASE_V4;

  // GUESS, not yet confirmed live (2026-09-30): character-recruit bits
  // ($7E1510-1512 for v4.x) and key-item-check bits ($7E1514-151B for v4.x)
  // are both dead for Alpha 5.0 - live-watched all session, essentially no
  // activity there. Objectives shifted by exactly +0x10 ($7E1520->$7E1530);
  // this applies that SAME +0x10 shift here too ($7E1510->$7E1520,
  // $7E1514->$7E1524), since $7E1520-152B is exactly the region that
  // correlated with check completions all session (including "check gave
  // nothing" cases), and a uniform +0x10 shift across every v4.x->v5 tracker
  // region would explain that cleanly. Explicitly a guess to be tested live,
  // not a confirmed formula like OBJECTIVE_PROGRESS_BASE_V5 - see
  // PROJECT_NOTES.md "Checks: GUESS implemented" for how to verify/falsify it.
  const CHAR_LOC_BASE_V4 = 0x10;
  const CHAR_LOC_BASE_V5 = 0x20;
  const CHECK_LOC_BASE_V4 = 0x14;
  const CHECK_LOC_BASE_V5 = 0x24;
  module.charLocBase = CHAR_LOC_BASE_V4;
  module.checkLocBase = CHECK_LOC_BASE_V4;

  async function get_objectives_from_metadata() {
    try {
      const meta = await readRomMetadata({ readRom: readRomViaLegacyClient });
      console.log('ROM metadata loaded: version', meta.version, meta.objectives ? `- ${meta.objectives.length} objectives` : '- no objectives array');

      if (meta.objectives && isAlpha5Version(meta.version)) {
        const built = buildObjectiveTasksV5(meta.objectives);
        module.objectiveGroupsV5 = built.groups;
        module.objectiveTasksV5 = built.tasks;
        // Only polled (non-computed) tasks go into the flat module.objectives
        // contract the rest of the tracker already knows how to render and
        // poll a WRAM progress byte per index for - a {group,req} cross-group
        // reference has no byte of its own (see objectives-v5.js).
        const polled = built.tasks.filter((t) => !t.isComputed);
        module.objectives = polled.map((t) => t.description);
        module.objectiveTargets = polled.map((t) => ({ type: t.type, target: t.target }));
        module.objectiveProgressBase = OBJECTIVE_PROGRESS_BASE_V5;
        module.charLocBase = CHAR_LOC_BASE_V5;
        module.checkLocBase = CHECK_LOC_BASE_V5;
      } else {
        module.objectiveGroupsV5 = null;
        module.objectiveTasksV5 = null;
        module.objectives = meta.objectives;
        module.objectiveTargets = (meta.objectives || []).map(parseObjectiveTarget);
        module.objectiveProgressBase = OBJECTIVE_PROGRESS_BASE_V4;
        module.charLocBase = CHAR_LOC_BASE_V4;
        module.checkLocBase = CHECK_LOC_BASE_V4;
      }

      module.flags = meta.flags; // rom-metadata.js already uppercases and nulls out "(hidden)"
      module.seed = meta.seed; // identifies this seed (per-seed saved tracker state)
      module.seed_loaded(meta.seed, meta.version);
      module.set_live_objectives();
    } catch (e) {
      console.error('Failed to read/parse ROM metadata:', e.message);
    }
  }

  // This can handle arbitrary length objectives, but doesn't appear to work on emulators
  module.get_objectives_from_file_metadata = get_objectives_from_file_metadata;
  function get_objectives_from_file_metadata() {
    module.network.snes.send(module.network.snes.create_message("Info")
  ).then((out) => {
     let infoArray = JSON.parse(out.data).Results;
     let filename = infoArray[2];
     return filename;
   }).then((filename) => {
     return module.network.snes.getFile(
       module.network.snes.create_message("GetFile",[filename]))
   }).then((metadata) => {
     module.objectives = JSON.parse(metadata).objectives;
     module.flags = JSON.parse(metadata).flags.toUpperCase();
     module.set_live_objectives();
     return;
   });
  }

  module.auto_set_objective = (a,b) => {}
  module.set_objective = set_objective
  function set_objective(index, truth=True) {
    module.auto_set_objective(index, truth);
    //console.log("lki:" + index + ":" + truth);
  }

  module.keep_updating_kis = keep_updating_kis
  // The $7E1500 tracker block is re-read every 100 ms and occasionally reads
  // wrong for a moment, which made key items, check locations, character
  // spots and objectives flicker (and, before, could wipe locations). Every
  // byte's new value is only accepted after it has read the same way
  // BLOCK_STABLE_READS times in a row (~0.3 s); the very first read is
  // accepted as-is. All tracking below only ever sees these settled values.
  const BLOCK_STABLE_READS = 3;
  let stableBlock = null, candidateBlock = null, candidateReads = null;
  function stabilize_tracker_block(raw) {
    if (!stableBlock || stableBlock.length !== raw.length) {
      stableBlock = raw.slice();
      candidateBlock = raw.slice();
      candidateReads = new Uint8Array(raw.length);
      return stableBlock.slice();
    }
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === stableBlock[i]) {
        candidateReads[i] = 0;
      } else if (raw[i] === candidateBlock[i] && candidateReads[i] > 0) {
        if (++candidateReads[i] >= BLOCK_STABLE_READS) {
          stableBlock[i] = raw[i];
          candidateReads[i] = 0;
        }
      } else {
        candidateBlock[i] = raw[i];
        candidateReads[i] = 1;
      }
    }
    return stableBlock.slice();
  }

  function keep_updating_kis() {
    // Skip this tick if the previous poll hasn't come back yet (slow devices
    // would otherwise pile up requests)
    if (module._pollInFlight) return;
    module._pollInFlight = true;

    let count = 0x20;
    if (module.objectives) {
      count += module.objectives.length;
    }
    // Add extra bytes to read Stats (0x7E1578-0x7E1580 = 9 bytes)
    // Stats_Bosses is at 0x7E157C (offset 0x7C from 0x7E1500)
    count = Math.max(count, 0x7D); // Ensure we read up to 0x7C + 1
    let hexCount = count.toString(16);
    module.network.snes.send(JSON.stringify({
       "Opcode" : "GetAddress",
       "Space" : "SNES",
       "Operands": ["0xF51500", hexCount]
    })).then(
      (event_ki) => {
       return event_ki.data.arrayBuffer()
     }).then(
       (arrBuf) => {
         let memory = stabilize_tracker_block(new Uint8Array(arrBuf));

         for (let i = 0; i <= 2; i++) {
            for (let b = 0; b < 8; b++) {
              let index = (i * 8 + b);
              if (index > 0x10) continue;  // Read up to Crystal (0x10), skip Pass (0x11)
              let truth = !!(memory[i] & (1 << b));
              set_ki(index, truth);
            }
          }
          for (let i = 3; i <= 5; i++) {
             for (let b = 0; b < 8; b++) {
               let index = (i * 8 + b) - 24;
               if (index > (0x10)) continue;  // Read up to Crystal (0x10), skip Pass (0x11)
               let truth = !!(memory[i] & (1 << b));
               set_used_ki(index, truth);
             }
           }
           // Read character location flags (slots 0x03-0x14 = 3 bytes starting
           // at charLocBase - $7E1510 for v4.x, $7E1520 GUESS for v5)
           // Track changes for debugging
           const charLocBase = module.charLocBase;
           let charState = [];
           for (let i = charLocBase; i <= charLocBase + 2; i++) {
             for (let b = 0; b < 8; b++) {
               let index = (i * 8 + b) - charLocBase*8;
               if (index > 0x14) continue;
               if (!!(memory[i] & (1 << b))) {
                 charState.push(`0x${index.toString(16).toUpperCase().padStart(2, '0')}`);
               }
             }
           }
           let currentCharState = charState.join(',');
           if (!module._lastCharState) module._lastCharState = '';
           if (currentCharState !== module._lastCharState) {
             console.warn(`👥 CHAR LOCATIONS CHANGED: "${module._lastCharState || 'INIT'}" -> "${currentCharState}"`);
             module._lastCharState = currentCharState;
           }

           // Report each character recruit slot only when its bit changes
           // (reporting every poll made the tracker overwrite flag-driven
           // states 10 times a second); tracker.html decides what a change
           // means for the seed's C flags
           if (!module._charLocBits) module._charLocBits = {};
           for (let i = charLocBase; i <= charLocBase + 2; i++) {
             for (let b = 0; b < 8; b++) {
               let index = (i * 8 + b) - charLocBase*8;
               if (index > 0x14) continue;  // Character slots go up to 0x14
               let truth = !!(memory[i] & (1 << b));
               if (module._charLocBits[index] !== truth) {
                 module._charLocBits[index] = truth;
                 set_loc_character(index, truth);
               }
             }
           }
           // Read key item location flags (slots 0x20-0x5D = 8 bytes starting
           // at checkLocBase - $7E1514 for v4.x, $7E1524 GUESS for v5)
           // Track changes for debugging
           const checkLocBase = module.checkLocBase;
           let locState = [];
           for (let i = checkLocBase; i <= checkLocBase + 7; i++) {
             for (let b = 0; b < 8; b++) {
               let index = (i * 8 + b) - checkLocBase*8;
               if (index > 0x5D) continue;
               if (!!(memory[i] & (1 << b))) {
                 locState.push(`0x${(index + 0x20).toString(16).toUpperCase()}`);
               }
             }
           }
           let currentLocState = locState.join(',');
           if (!module._lastLocState) module._lastLocState = '';
           if (currentLocState !== module._lastLocState) {
             console.warn(`📍 LOCATION CHANGED: "${module._lastLocState || 'INIT'}" -> "${currentLocState}"`);
             module._lastLocState = currentLocState;
           }

           // Report each key item check slot only when its bit changes (same
           // reasoning as the character slots above)
           if (!module._kiLocBits) module._kiLocBits = {};
           for (let i = checkLocBase; i <= checkLocBase + 7; i++) {
             for (let b = 0; b < 8; b++) {
               let slot = (i * 8 + b) - checkLocBase*8 + 0x20;
               let truth = !!(memory[i] & (1 << b));
               if (module._kiLocBits[slot] !== truth) {
                 module._kiLocBits[slot] = truth;
                 set_loc_ki(slot, truth);
               }
             }
           }

           // GUESS, not confirmed (2026-09-30): Feymarch Chest (ki_location_map
           // slot 0x2D) was the one check that never auto-cleared on v5, even
           // after the +0x10 base shift fixed every other check. Re-examined
           // the original live log from that exact pickup: nothing in the
           // normal check range (checkLocBase..+7) changed at the time, but
           // $7E1518 bit 5 flipped ~10s later - matching the known "write
           // lands after the dialogue box closes" delay seen all session. That
           // byte is outside the range the loop above reads at all, so even if
           // this is the real signal, it was never being polled. Wiring it in
           // directly as an alternate source for slot 0x2D specifically, since
           // only this one location was ever reported broken - not widening
           // the whole loop on a single data point.
           //
           // v5-only: $7E1518 falls INSIDE v4.x's own check range (0x14-0x1B),
           // so the main loop above already reads it there under v4.x's own
           // formula - adding this unconditionally would double-fire slot 0x2D
           // with an unrelated v4.x bit's value.
           if (module.objectiveGroupsV5) {
             if (!module._feyChestBit) module._feyChestBit = false;
             let feyChestBit = !!(memory[0x18] & 0x20);
             if (module._feyChestBit !== feyChestBit) {
               module._feyChestBit = feyChestBit;
               set_loc_ki(0x2D, feyChestBit);
             }

             // Lunar Ribbon altar never sets its check slot (0x39/0x3A =
             // $7E1527 bits 1-2) on v5. The only change at that altar, seen on
             // two seeds (2026-09-30), is $7E150F bit 1 (bits 0/2 track the
             // White Spear/Masamune altars).
             if (!module._ribbonBit) module._ribbonBit = false;
             let ribbonBit = !!(memory[0x0F] & 0x02);
             if (module._ribbonBit !== ribbonBit) {
               module._ribbonBit = ribbonBit;
               set_loc_ki(0x39, ribbonBit);
             }
           }
           if (module.objectives) {
             // Objectives__Progress is a raw per-slot counter, not a bit -
             // completion is progress >= target, not "nonzero". A simple
             // quest/boss/char objective has target 1 so this is equivalent
             // to the old nonzero check there, but counted objectives
             // (Boss Collector/Gold Hunter/Dark Matter/Key Item Hunt) have
             // targets in the tens or thousands and would previously have
             // been marked complete the instant progress ticked off zero.
             // Targets are parsed once from the description text in
             // get_objectives_from_metadata() (see objectives.js).
             const progressBase = module.objectiveProgressBase;
             let objState = [];
             for (let i=0; i < module.objectives.length; i++) {
               let target = (module.objectiveTargets && module.objectiveTargets[i]) ? module.objectiveTargets[i].target : 1;
               if (memory[progressBase + i] >= target) {
                 objState.push(module.objectives[i]);
               }
             }
             let currentObjState = objState.join(',');
             if (!module._lastObjState) module._lastObjState = '';
             if (currentObjState !== module._lastObjState) {
               console.warn(`🎯 OBJECTIVES CHANGED: "${module._lastObjState || 'INIT'}" -> "${currentObjState}"`);
               module._lastObjState = currentObjState;
             }

             // Raw per-objective progress bytes, exposed for UI progress
             // counters (Gold Hunter/Dark Matter/Boss Collector all need
             // "current/target" display, not just a pass/fail boolean).
             module.objectiveProgress = Array.from(memory.slice(progressBase, progressBase + module.objectives.length));

             for (let i=0; i < module.objectives.length; i++) {
               let target = (module.objectiveTargets && module.objectiveTargets[i]) ? module.objectiveTargets[i].target : 1;
               module.set_objective(module.objectives[i], memory[progressBase + i] >= target);
             }
           }
           // Read boss count from Stats_Bosses at offset 0x7C
           if (memory.length > 0x7C) {
             let bossCount = memory[0x7C];
             module.set_boss_count(bossCount);

             // Auto boss tracking. The game keeps no record of WHICH bosses were
             // beaten, only this counter, which goes up once at the end of each
             // boss fight. When it goes up by exactly one, read the formation of
             // the battle just fought ($7E1800-1801, still holding the boss's
             // formation) - boss rando plays the assigned boss's own formation,
             // so it identifies the boss. The first read (connect / page load)
             // and bigger jumps (loading a save) only set the baseline.
             if (module._lastBossCount !== undefined && bossCount === module._lastBossCount + 1) {
               module.network.snes.send(JSON.stringify({
                 "Opcode" : "GetAddress",
                 "Space" : "SNES",
                 "Operands": ["0xF51800", "2"]
               })).then(
                 (event_formation) => event_formation.data.arrayBuffer()
               ).then(
                 (buf) => {
                   let f = new Uint8Array(buf);
                   module.boss_defeated(f[0] | (f[1] << 8));
                 }
               ).catch(() => {});
             }
             module._lastBossCount = bossCount;
           }

           // Alpha 5.0 battle results screen ("Received N Exp. (M x)"): while it
           // is up, $7E00A6-A9 = 00 02 30 05, $7E00AA = multiplier x1000 (16-bit),
           // $7E00AD = Exp received (24-bit). Confirmed on SD2SNES 2026-09-30:
           // 12015 @ 2756, 98280 @ 2808, 1702 @ 1000 (no bonus flags). Galeswift
           // 4.7 writes the same signature and Exp but leaves junk (1280) in the
           // multiplier slot, so this stays v5-only.
           xpPollCounter++;
           if (module.objectiveGroupsV5 && xpPollCounter >= 5) {
             xpPollCounter = 0;
             module.network.snes.send(JSON.stringify({
               "Opcode" : "GetAddress",
               "Space" : "SNES",
               "Operands": ["0xF500A6", "A"]
             })).then(
               (ev) => ev.data.arrayBuffer()
             ).then(
               (buf) => {
                 let r = new Uint8Array(buf);
                 if (r.length < 10 || r[0] !== 0x00 || r[1] !== 0x02 || r[2] !== 0x30 || r[3] !== 0x05) return;
                 let mult = r[4] | (r[5] << 8);
                 let exp = r[7] | (r[8] << 8) | (r[9] << 16);
                 if (mult < 1000 || mult > 50000 || exp === 0) return;
                 if (mult === module._lastLiveXP && exp === module._lastLiveExp) return;
                 module._lastLiveXP = mult;
                 module._lastLiveExp = exp;
                 console.warn(`⭐ BATTLE XP: ${exp} Exp at ${(mult / 1000).toFixed(3)}x`);
                 if (typeof setLiveXPMultiplier === 'function') setLiveXPMultiplier(mult);
               }
             ).catch(() => {});
           }

           // Only read party member data every 10 cycles (once per second) to avoid spam
           // Every ~15 seconds, re-read the seed ID from the ROM so a swapped ROM
           // is noticed (the tracker then saves the old seed and reloads)
           seedCheckCounter++;
           if (seedCheckCounter >= 150 && module.seed) {
             seedCheckCounter = 0;
             readRomMetadata({ readRom: readRomViaLegacyClient }).then(
               (meta) => {
                 if (meta.seed && meta.seed !== module.seed) {
                   module.seed = meta.seed;
                   module.seed_loaded(meta.seed, meta.version);
                 }
               }
             ).catch(() => {}); // mid-swap / loading reads are ignored
           }

           partyUpdateCounter++;
           if (partyUpdateCounter >= 10) {
             partyUpdateCounter = 0;
             // Now read party member data ($7E1000-$7E1285 = 5 party slots + plot flags),
             // extended through the inventory ($7E1440-$7E149F) for the Pass
             module.network.snes.send(JSON.stringify({
                "Opcode" : "GetAddress",
                "Space" : "SNES",
                "Operands": ["0xF51000", "4A0"]
             })).then(
               (event_party) => {
                return event_party.data.arrayBuffer()
              }).then(
                (arrBuf_party) => {
                  let partyMemory = new Uint8Array(arrBuf_party);
                  module.update_party_characters(partyMemory);
                  update_pass_from_inventory(partyMemory);
              }).catch((err) => {
                // Silently ignore BUSY errors from USB2SNES
                if (err !== false && err !== 'BUSY') {
                  console.error('Failed to read party data:', err);
                }
              });
           }

           // Don't call ApplyChecks every cycle - it's called when party changes
           // and when hook route changes, which is sufficient
     },
     (err) => { /* console.log("bleh" + err) */ }).finally(() => { module._pollInFlight = false; });
   }

   module.auto_set_ki = (a,b) => {}
   module.set_ki = set_ki
    function set_ki(index, truth=True) {
      module.auto_set_ki(index, truth);
      //console.log("ki:" + index + ":" + truth);
    }
    module.auto_set_used_ki = (a,b) => {}
    module.set_used_ki = set_used_ki
    function set_used_ki(index, truth=True) {
      module.auto_set_used_ki(index, truth);
      //console.log("uki:" + index + ":" + truth);
    }
    module.auto_set_loc_ki = (a,b) => {}
    module.set_loc_ki = set_loc_ki
    function set_loc_ki(index, truth=True) {
      module.auto_set_loc_ki(index, truth);
      //console.log("lki:" + index + ":" + truth);
    }
    module.auto_set_loc_character = (a,b) => {}
    module.set_loc_character = set_loc_character
    function set_loc_character(index, truth=True) {
      module.auto_set_loc_character(index, truth);
      //console.log("lchar:" + index + ":" + truth);
    }

    // Character autotracking
    module.update_party_characters = update_party_characters
    module.set_character = (a,b,c) => {} // Will be set by tracker.html
    module.party_changed = (a) => {} // Will be set by tracker.html - whole visible party, in order
    module.set_hook_route = (a) => {} // Will be set by tracker.html
    module.set_boss_count = (a) => {} // Will be set by tracker.html
    module.boss_defeated = (a) => {} // Will be set by tracker.html - formation ID of a boss fight just won
    module.seed_loaded = (a, b) => {} // Will be set by tracker.html - seed ID and version from the ROM metadata
    module.apply_checks = () => {} // Will be set to ApplyChecks by tracker.html
    module.notify_character_gained = (a) => {} // Will be set by tracker.html - called when a new character joins

    // The Pass has no bit in the game's key item "found" flags (its tracker
    // table only lists the other 17 key items), whether it comes from a key
    // item check (Pkey), a shop, a chest or Kstart:pass. So look for it in the
    // inventory instead: 48 (item, quantity) pairs at $7E1440 - the same check
    // the game uses for the Pass door. Reported only when it changes.
    const PASS_ITEM_CODE = 0xEC;
    let lastHasPass = null;
    let pendingHasPass = null;
    function update_pass_from_inventory(memory) {
      if (memory.length < 0x4A0) return;
      let hasPass = false;
      for (let i = 0x440; i < 0x4A0; i += 2) {
        if (memory[i] === PASS_ITEM_CODE && memory[i + 1] > 0) {
          hasPass = true;
          break;
        }
      }
      // like the party, a change must read the same way twice in a row (~1 s apart)
      if (hasPass !== lastHasPass) {
        if (hasPass === pendingHasPass) {
          lastHasPass = hasPass;
          pendingHasPass = null;
          set_ki(0x11, hasPass);
        } else {
          pendingHasPass = hasPass;
        }
      } else {
        pendingHasPass = null;
      }
    }

    // Track which characters we've ever seen
    let knownCharacters = new Set();

    function update_party_characters(memory) {
      // Character ID mapping: 0=Cecil DK, 1=Kain, 2=Rydia Kid, 3=Tellah, 4=Edward,
      //                       5=Rosa, 6=Yang, 7=Palom, 8=Porom, 9=Paladin Cecil,
      //                       10=Cid, 11=Adult Rydia, 12=Edge, 13=FuSoYa
      const charIdMap = {0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 0, 10: 9, 11: 2, 12: 10, 13: 11};

      // Build current party state string to compare with previous
      let partyStateArray = [];

      // Read 5 party slots (each 0x40 bytes)
      for (let slot = 0; slot < 5; slot++) {
        let offset = slot * 0x40;
        let statusByte = memory[offset + 0x00]; // Status byte at offset +0
        let charByte = memory[offset + 0x01]; // Job ID is at offset +1
        let charId = charByte & 0x0F; // Lower 4 bits = character ID

        // Check if slot is occupied by looking at status byte
        // Empty slots have statusByte = 0x00, occupied slots have status flags set
        if (statusByte !== 0x00 && charId in charIdMap) {
          // For Cecil and Rydia, include form in state
          if (charId === 0 || charId === 9) {
            // 0 = Dark Knight, 9 = Paladin
            partyStateArray.push((charId === 9 ? '0P' : '0D'));
          } else if (charId === 2 || charId === 11) {
            // 2 = Kid Rydia, 11 = Adult Rydia
            partyStateArray.push((charId === 11 ? '2A' : '2K'));
          } else {
            partyStateArray.push(charId);
          }
        }
      }

      let currentPartyState = partyStateArray.join(',');

      // Party memory occasionally reads mid-change (menus, battle transitions),
      // which made the party panel flicker. Only accept a new composition once
      // it has been read the same way PARTY_STABLE_READS times in a row (reads
      // are ~1 second apart), and never accept an empty party - the game always
      // has at least one character, so an empty read is always a glitch.
      if (partyStateArray.length === 0) {
        pendingPartyState = null;
        pendingPartyReads = 0;
      } else if (currentPartyState !== lastPartyState) {
        if (currentPartyState === pendingPartyState) {
          pendingPartyReads++;
        } else {
          pendingPartyState = currentPartyState;
          pendingPartyReads = 1;
        }
      } else {
        // back to the shown party: whatever was pending was a glitch
        pendingPartyState = null;
        pendingPartyReads = 0;
      }

      // Only update if party composition changed (and the change is stable)
      if (partyStateArray.length > 0 && currentPartyState !== lastPartyState &&
          pendingPartyReads >= PARTY_STABLE_READS) {
        lastPartyState = currentPartyState;
        pendingPartyState = null;
        pendingPartyReads = 0;

        // Get party limit from modeflags (if available)
        let partyLimit = (typeof modeflags !== 'undefined' && modeflags.climit) ? parseInt(modeflags.climit) : 5;

        // First pass: collect all characters from game memory
        let charactersInGame = [];
        for (let slot = 0; slot < 5; slot++) {
          let offset = slot * 0x40;
          let statusByte = memory[offset + 0x00];
          let charByte = memory[offset + 0x01];
          let charId = charByte & 0x0F;

          if (statusByte !== 0x00 && charId in charIdMap) {
            let trackerId = charIdMap[charId];
            let isPaladin = (charId === 9);
            let isAdult = (charId === 11);
            charactersInGame.push({ trackerId, isPaladin, isAdult, gameSlot: slot });

            // Detect new characters and notify tracker
            let charKey = charId; // Use game char ID to track (handles Cecil/Rydia forms separately)
            if (!knownCharacters.has(charKey)) {
              knownCharacters.add(charKey);
              module.notify_character_gained(charId);
            }
          }
        }

        // Second pass: place characters in visible tracker slots
        let usedTrackerSlots = new Set();

        // First, place characters that are in visible game slots
        for (let char of charactersInGame) {
          if (char.gameSlot < partyLimit) {
            module.set_character(char.trackerId, true, char.isPaladin || char.isAdult, char.gameSlot);
            usedTrackerSlots.add(char.gameSlot);
          }
        }

        // Then, place characters from hidden game slots into empty visible tracker slots
        let nextAvailableSlot = 0;
        for (let char of charactersInGame) {
          if (char.gameSlot >= partyLimit) {
            // Find first empty visible tracker slot
            while (nextAvailableSlot < partyLimit && usedTrackerSlots.has(nextAvailableSlot)) {
              nextAvailableSlot++;
            }
            if (nextAvailableSlot < partyLimit) {
              module.set_character(char.trackerId, true, char.isPaladin || char.isAdult, nextAvailableSlot);
              usedTrackerSlots.add(nextAvailableSlot);
              nextAvailableSlot++;
            }
          }
        }

        // Clear any remaining empty visible slots
        for (let slot = 0; slot < partyLimit; slot++) {
          if (!usedTrackerSlots.has(slot)) {
            module.set_character(-1, false, false, slot);
          }
        }

        // Hand the tracker the whole party at once (visible game slots first,
        // then any from hidden slots) so it can handle duplicates and removals
        let partyIds = charactersInGame.filter(c => c.gameSlot < partyLimit).map(c => c.trackerId)
          .concat(charactersInGame.filter(c => c.gameSlot >= partyLimit).map(c => c.trackerId))
          .slice(0, partyLimit);
        module.party_changed(partyIds);
      }

      // Check Hook Route - plot bit at byte 0x283, bit 7
      if (memory.length >= 0x286) {
        let hookRouteCleared = !!(memory[0x283] & 0x80);
        // Only update if hook route state changed
        if (hookRouteCleared !== lastHookRoute) {
          lastHookRoute = hookRouteCleared;
          module.set_hook_route(hookRouteCleared);
        }
      }
    }

    return module;
}

//7E:1500-1502 : Found key items (1 bit per item)
//7E:1503-1505 : Used key items (1 bit per item)
//7E:1510-151F : Checked potential key item locations (1 bit per location)
//7E:1520-15?? : Objectives, one byte per objective
//70:7080-70A1 : Locations where each key item was found (2 bytes per item)
