function tracking_interface() {
  let timerID;
  let module = {};
  let partyUpdateCounter = 0; // Counter to throttle party updates
  let lastPartyState = ''; // Track previous party composition to detect changes
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
  module.flags = null; // WARNING: Flags will be <hidden> on a mystery seed
  module.get_objectives_from_metadata = get_objectives_from_metadata;
  async function get_objectives_from_metadata() {
      return module.network.snes.send(JSON.stringify({
         "Opcode" : "GetAddress",
         "Space" : "SNES",
         "Operands": ["0x1FF000", '400']
      })).then(
        (event) => {
         return event.data.arrayBuffer()
       }).then(
       (metadata) => {
         let x = new Uint8Array(metadata);
         let bytes = x[0] + 256 * x[1];
         let meta = new TextDecoder("utf-8").decode(x.slice(4,bytes+4));
         console.log('Raw metadata:', meta);
         try {
           let parsedMeta = JSON.parse(meta);
           module.objectives = parsedMeta.objectives;
           module.flags = parsedMeta.flags.toUpperCase();
           module.set_live_objectives();
         } catch (e) {
           console.error('Failed to parse ROM metadata JSON:', e);
           console.log('Metadata string:', meta);

           // Fallback: Try to extract flags from truncated JSON
           try {
             let flagsMatch = meta.match(/"flags":\s*"([^"]+)"/);
             if (flagsMatch && flagsMatch[1]) {
               console.log('Extracted flags from truncated metadata:', flagsMatch[1]);
               module.flags = flagsMatch[1].toUpperCase();
               module.objectives = null; // Set to null since they're truncated
               // Parse flags manually by calling FlagStringParser
               if (typeof FlagStringParser === 'function') {
                 console.log('Calling FlagStringParser with extracted flags');
                 FlagStringParser(module.flags);
               }
             }
           } catch (e2) {
             console.error('Failed to extract flags from truncated metadata:', e2);
           }
         }
         return;
     });
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
  function keep_updating_kis() {
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
         let memory = new Uint8Array(arrBuf);

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
           // Read character location flags (slots 0x03-0x14 = bytes 0x10-0x12)
           // Track changes for debugging
           let charState = [];
           for (let i = 0x10; i <= 0x12; i++) {
             for (let b = 0; b < 8; b++) {
               let index = (i * 8 + b) - 0x10*8;
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

           for (let i = 0x10; i <= 0x12; i++) {
             for (let b = 0; b < 8; b++) {
               let index = (i * 8 + b) - 0x10*8;
               if (index > 0x14) continue;  // Character slots go up to 0x14
               let truth = !!(memory[i] & (1 << b));
               set_loc_character(index, truth);
             }
           }
           // Read key item location flags (slots 0x20-0x5D = bytes 0x14-0x1B)
           // Track changes for debugging
           let locState = [];
           for (let i = 0x14; i <= 0x1B; i++) {
             for (let b = 0; b < 8; b++) {
               let index = (i * 8 + b) - 0x14*8;
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

           for (let i = 0x14; i <= 0x1B; i++) {
             for (let b = 0; b < 8; b++) {
               let index = (i * 8 + b) - 0x14*8;
               if (index > (0x5D)) continue;
               let truth = !!(memory[i] & (1 << b));
			   if (keyitemlocations[ki_location_map[index + 0x20]] != 4) {
               set_loc_ki(index + 0x20, truth);
			   }
             }
           }
           if (module.objectives) {
             // Track objective changes for debugging
             let objState = [];
             for (let i=0; i < module.objectives.length; i++) {
               if (!!memory[0x20 + i]) {
                 objState.push(module.objectives[i]);
               }
             }
             let currentObjState = objState.join(',');
             if (!module._lastObjState) module._lastObjState = '';
             if (currentObjState !== module._lastObjState) {
               console.warn(`🎯 OBJECTIVES CHANGED: "${module._lastObjState || 'INIT'}" -> "${currentObjState}"`);
               module._lastObjState = currentObjState;
             }

             for (let i=0; i < module.objectives.length; i++) {
               module.set_objective(module.objectives[i], !!memory[0x20 + i]);
             }
           }
           // Read boss count from Stats_Bosses at offset 0x7C
           if (memory.length > 0x7C) {
             let bossCount = memory[0x7C];
             module.set_boss_count(bossCount);
           }

           // Only read party member data every 10 cycles (once per second) to avoid spam
           partyUpdateCounter++;
           if (partyUpdateCounter >= 10) {
             partyUpdateCounter = 0;
             // Now read party member data ($7E1000-$7E1285 = 0x286 bytes for 5 party slots + plot flags)
             module.network.snes.send(JSON.stringify({
                "Opcode" : "GetAddress",
                "Space" : "SNES",
                "Operands": ["0xF51000", "286"]
             })).then(
               (event_party) => {
                return event_party.data.arrayBuffer()
              }).then(
                (arrBuf_party) => {
                  let partyMemory = new Uint8Array(arrBuf_party);
                  module.update_party_characters(partyMemory);
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
     (err) => { /* console.log("bleh" + err) */ });
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
    module.set_hook_route = (a) => {} // Will be set by tracker.html
    module.set_boss_count = (a) => {} // Will be set by tracker.html
    module.apply_checks = () => {} // Will be set to ApplyChecks by tracker.html
    module.notify_character_gained = (a) => {} // Will be set by tracker.html - called when a new character joins

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

      // Only update if party composition changed
      if (currentPartyState !== lastPartyState) {
        lastPartyState = currentPartyState;

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
