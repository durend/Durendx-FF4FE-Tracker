// objectives.js
// Turns the flat list of pre-rendered objective description strings from ROM
// metadata (see rom-metadata.js) into trackable Task objects, and matches
// live progress bytes from WRAM against each task's target.
//
// Why regex the description text instead of reading a thresholds table from
// ROM: the patcher does NOT expose a separate structured threshold array to
// external tools - the on-cartridge tracker menu has its own internal ROM
// table (objectives.f4c: Objectives__Thresholds @ $21f840), but that's SNES
// bank-addressed ROM data whose PC/file-offset mapping we haven't verified.
// Kyuuden's Companion tracker sidesteps this entirely by extracting the
// target count straight out of the description text instead (it already has
// the number baked in by the patcher), then only reads the single live
// progress byte per objective from Objectives__Progress ($7E1520+i).
// That's a smaller, already-proven surface, so this tracker does the same
// (see GaleswiftFork/Objectives.cs `Regex.Match(description, "Defeat (\\d*) bosses")`
// in Kyuuden/Companion for the reference implementation).
//
// Exact templates (FreeEnt/objective_data.py + objective_rando.py ~line 1003):
//   Boss Collector: "Defeat %d %t"                 -> "Defeat 20 bosses"
//   Gold Hunter:    "Bring %d GP to Tory in Agart"  -> "Bring 25,000 GP to Tory in Agart"
//   Dark Matter:    (built directly, no template)   -> "Bring 25 DkMatters to Kory in Agart"
//   Key Item Hunt:  "Obtain %d key %t"              -> "Obtain 10 key items"
// Anything else (quest/boss/char objectives) has an implicit target of 1 -
// the progress byte just flips from 0 to 1 on completion.

const COUNTED_OBJECTIVE_PATTERNS = [
  { type: 'bossCollector', regex: /Defeat (\d+) boss(?:es)?/i },
  { type: 'goldHunter', regex: /Bring ([\d,]+) GP to Tory in Agart/i },
  { type: 'darkMatter', regex: /Bring (\d+) DkMatters? to Kory in Agart/i },
  { type: 'keyItemHunt', regex: /Obtain (\d+) key items?/i },
];

// Only Boss Collector's progress byte is a real counter. The patcher writes a
// threshold of 1 for Gold Hunter, Dark Matter and Key Item Hunt
// (objective_rando.py, `threshold_list.append('01')` - verified against
// Galeswift v4.7.0): their byte just flips 0 -> 1 when the objective is
// turned in, and the real GP/DkMatter/KI goal is tracked elsewhere in-game.
// So `target` is the completion threshold for the live byte, and `goal` is
// the number from the description, for display only.
const BYTE_IS_COUNTER = new Set(['bossCollector']);

function parseObjectiveTarget(description) {
  for (const { type, regex } of COUNTED_OBJECTIVE_PATTERNS) {
    const match = description.match(regex);
    if (match) {
      const goal = parseInt(match[1].replace(/,/g, ''), 10);
      return { type, target: BYTE_IS_COUNTER.has(type) ? goal : 1, goal };
    }
  }
  return { type: 'simple', target: 1, goal: 1 };
}

// Builds the task list from a metadata.objectives string array (rom-metadata.js)
// plus optional Ogated/Ohardreq slot numbers parsed from the flag string
// (objectives are 0-indexed here to match slot position in the array, same
// order the patcher wrote Objectives__Progress in).
function buildObjectiveTasks(descriptions, { gatedSlots = [], hardRequiredSlots = [] } = {}) {
  const gated = new Set(gatedSlots.map((n) => n - 1));
  const hardRequired = new Set(hardRequiredSlots.map((n) => n - 1));

  return descriptions.map((description, index) => {
    const { type, target } = parseObjectiveTarget(description);
    return {
      index,
      description,
      type,
      target,
      current: 0,
      isCompleted: false,
      isGated: gated.has(index),
      isHardRequired: hardRequired.has(index),
    };
  });
}

// Applies a live progress byte array (one byte per task, in task-index order -
// this is exactly Objectives__Progress sliced to `tasks.length` bytes) and
// returns true if anything changed, so the caller knows whether to re-render.
function applyObjectiveProgress(tasks, progressBytes) {
  let changed = false;
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const current = progressBytes[i] ?? 0;
    if (current !== task.current) {
      task.current = current;
      task.isCompleted = current >= task.target;
      changed = true;
    }
  }
  return changed;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseObjectiveTarget, buildObjectiveTasks, applyObjectiveProgress, COUNTED_OBJECTIVE_PATTERNS };
}
