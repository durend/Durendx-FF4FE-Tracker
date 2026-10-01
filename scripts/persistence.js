// persistence.js
// Remembers the tracker's state so it survives refreshes and relaunches,
// without ever carrying anything over to a different seed.
//
// - Auto-tracking: state is saved per seed, keyed by the seed ID the tracker
//   reads from the ROM metadata. Refreshing or relaunching on the same seed
//   restores it; a different seed starts clean (or restores that seed's own
//   save). If the seed changes while the page is open (ROM swapped), the old
//   seed is saved and the page reloads for the new one.
// - Manual mode: there is no seed ID, and two seeds with the same flags look
//   identical, so state only survives refreshes of the same launch (the
//   launcher stamps each launch with r=<time>); a new launch starts clean.
//
// Saves happen automatically every couple of seconds when something changed,
// and when the page closes. Only the last MAX_SAVES seeds/launches are kept.
var TrackerSave = (function () {
  const PREFIX = 'ff4fe-tracker-save:';
  const MAX_SAVES = 10;
  let key = null;        // storage key of the current seed / launch
  let seedId = null;     // seed ID when auto-tracking
  let enabled = false;   // nothing is saved until the key is known and restored
  let lastSaved = null;

  function snapshot() {
    return {
      bosses: bosses.slice(),
      keyitems: keyitems.slice(),
      usedkeyitems: usedkeyitems.slice(),
      characters: characters.slice(),
      keyitemlocations: keyitemlocations.slice(),
      characterlocations: characterlocations.slice(),
      townlocations: townlocations.slice(),
      trappedchestlocations: trappedchestlocations.slice(),
      trappedchestcounts: trappedchestcounts.slice(),
      objectives: objectives.slice(),
      generatedObjectivesCompleted: generatedObjectivesCompleted.slice(),
      manualObjectivesCompleted: manualObjectivesCompleted.slice(),
      items: items.slice(),
      itemsnotes: itemsnotes.slice(),
      dmcount: dmcount,
      goldcount: goldcount,
      hookclear: hookclear,
      ignorewarp: ignorewarp,
      cecil: cecil,
      rydia: rydia,
      partySlots: window.trackerPartySlots.slice(),
      partyForms: window.trackerPartyForms.slice(),
      xpLastLive: xpLastLive
    };
  }

  // Copy saved values into the existing arrays (other code holds references to them)
  function copyInto(target, source) {
    if (!Array.isArray(target) || !Array.isArray(source)) return;
    for (let i = 0; i < target.length && i < source.length; i++) target[i] = source[i];
  }

  function replaceContents(target, source) {
    if (!Array.isArray(target) || !Array.isArray(source)) return;
    target.length = 0;
    source.forEach(v => target.push(v));
  }

  function apply(s) {
    copyInto(keyitems, s.keyitems);
    copyInto(usedkeyitems, s.usedkeyitems);
    copyInto(characters, s.characters);
    copyInto(keyitemlocations, s.keyitemlocations);
    copyInto(characterlocations, s.characterlocations);
    copyInto(townlocations, s.townlocations);
    copyInto(trappedchestlocations, s.trappedchestlocations);
    copyInto(trappedchestcounts, s.trappedchestcounts);
    copyInto(objectives, s.objectives);
    replaceContents(generatedObjectivesCompleted, s.generatedObjectivesCompleted);
    replaceContents(manualObjectivesCompleted, s.manualObjectivesCompleted);
    copyInto(items, s.items);
    copyInto(itemsnotes, s.itemsnotes);
    if (typeof s.dmcount === 'number') dmcount = s.dmcount;
    if (typeof s.goldcount === 'number') goldcount = s.goldcount;
    if (typeof s.hookclear === 'boolean') hookclear = s.hookclear;
    if (typeof s.ignorewarp === 'boolean') ignorewarp = s.ignorewarp;
    if (typeof s.cecil === 'boolean') cecil = s.cecil;
    if (typeof s.rydia === 'boolean') rydia = s.rydia;
    if (typeof s.xpLastLive === 'number') {
      xpLastLive = s.xpLastLive;
      updateXPModifier();
    }

    // Bosses through setBossDefeated so the icons and the Mist Dragon flag follow
    if (Array.isArray(s.bosses)) {
      for (let i = 0; i < s.bosses.length; i++) setBossDefeated(i, !!s.bosses[i]);
    }

    for (let i = 0; i < characters.length; i++) {
      const marker = document.getElementById('character' + i + '_x');
      if (marker && characters[i]) marker.style.visibility = 'visible';
    }

    copyInto(window.trackerPartySlots, s.partySlots);
    copyInto(window.trackerPartyForms, s.partyForms);
    for (let i = 0; i < 5; i++) updateTrackerPartyDisplay(i);

    if (typeof ApplyChecks === 'function') ApplyChecks();
    if (typeof applyV2LocationStyling === 'function') applyV2LocationStyling();
    if (typeof updateObjectivesList === 'function') updateObjectivesList();
  }

  function prune() {
    const saves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      let t = 0;
      try { t = JSON.parse(localStorage.getItem(k)).t || 0; } catch (e) { /* corrupt entry: prune first */ }
      saves.push({ k, t });
    }
    saves.sort((a, b) => b.t - a.t);
    saves.slice(MAX_SAVES).forEach(s => localStorage.removeItem(s.k));
  }

  function save() {
    if (!enabled || !key) return;
    try {
      const state = snapshot();
      const data = JSON.stringify(state);
      if (data === lastSaved) return;
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), state: state }));
      lastSaved = data;
      prune();
    } catch (e) { /* storage unavailable - nothing to remember */ }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && saved.state) {
        apply(saved.state);
        console.log('Tracker state restored for', key);
      }
    } catch (e) {
      console.warn('Could not restore tracker state:', e.message);
    }
    lastSaved = JSON.stringify(snapshot());
    enabled = true;
  }

  // Manual mode: remember this launch only (refreshes keep it)
  function startSession(launchId) {
    if (!launchId || key) return;
    key = PREFIX + 'launch:' + launchId;
    restore();
  }

  // Auto-tracking: called with the seed ID read from the ROM (on connect and
  // on the periodic re-check)
  function seedLoaded(seed, version) {
    if (!seed) return;
    const id = (version ? version + ':' : '') + seed;
    if (seedId === null) {
      seedId = id;
      key = PREFIX + 'seed:' + id;
      restore();
    } else if (id !== seedId) {
      console.warn('Seed changed (' + seedId + ' -> ' + id + '); reloading the tracker for the new seed');
      save();
      enabled = false;
      location.reload();
    }
  }

  setInterval(save, 2000);
  window.addEventListener('beforeunload', save);

  return { startSession, seedLoaded, save };
})();
