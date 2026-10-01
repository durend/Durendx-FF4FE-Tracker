// objectives-v5.js
// Alpha 5.0 objective parsing: the ROM metadata's `objectives` field changes
// shape under v5 (meta.version starting "5" / "v5") from a flat array of
// pre-rendered description strings (v4.x/Galeswift, see objectives.js) into a
// nested array of ObjectiveGroups:
//   [{ key, name, tasks: [...], rewards: [...] }, ...]
// where each task is either:
//   - a plain string (objective id, implicit threshold 1)
//   - { objective, threshold }               (e.g. internal_gp / 250000)
//   - { group, req }                         (cross-group reference; req is
//                                              a number or the string "all")
// and each reward is { req, description, reward? } (req is a number or "all").
//
// This shape and the id->display-name lookup below are ported directly from
// Antidale/FeTracker.Common (an actively-maintained, real FF4FE Alpha 5.0
// tracker) - specifically FeTracker.Sni/Models/{ObjectiveGroup,TaskObjective,
// GroupObjective,ObjectiveReward}.cs, Converters/V5ObjectiveConverter.cs and
// Classes/ObjectiveDictionary.cs (fetched 2026-09-29). Verified against that
// repo's own unit test fixtures (ConverterTests/CompleteMetadataTests.cs,
// V5ObjectiveConvterTests.cs), not guessed.
//
// CONFIRMED (2026-09-29, live BizHawk+QUsb2Snes poll against a real v5.0.0-a.3
// seed while completing every polled task): the flattened task order below
// (group order, task order within group, cross-group refs excluded) does
// match the live progress bytes - but the base address is $7E1530, not
// $7E1520 like v4.x (see tracking_interface.js's objectiveProgressBase).
// 6-for-6 confirmed for a 2-group/6-task seed; not yet confirmed whether the
// base shifts for a different group/task count, or how a {objective,
// threshold} counted task (e.g. internal_gp) behaves live.

// Real seed versions seen so far: v4.x/Galeswift like "4.7.0.Gale" (no
// leading "v"), Alpha 5.0 like "v5.0.0-a.3" (leading "v", confirmed by
// reading the metadata straight out of a real dropped-in Alpha 5.0 ROM,
// 2026-09-29). Matches Antidale/FeTracker.Common's own "starts with v5" check.
function isAlpha5Version(version) {
  return typeof version === 'string' && /^v?5\./.test(version);
}

// char_*/boss_*/quest_* text is pulled from the live generator's own UI spec
// (https://alpha.ff4fe.com/script/uispec.js "title" fields per objective flag,
// fetched 2026-09-29 - the canonical source, not a third party's guess),
// then hand-trimmed for length so a full group doesn't overwhelm the
// OBJECTIVES panel (the site's own titles are full sentences, e.g. "Return
// the Pan to Yang's wife"; kept short here like "Return the Pan"). The
// internal_*/objectives_* templates are still ported from
// ObjectiveDictionary.ObjectiveLookup (C#, Antidale/FeTracker.Common) since
// the generator only exposes those as per-threshold flags (e.g.
// collect_gp250000), not a generic template.
const OBJECTIVE_LOOKUP_V5 = {
  char_cecil: 'Get Cecil',
  char_cid: 'Get Cid',
  char_edge: 'Get Edge',
  char_edward: 'Get Edward',
  char_fusoya: 'Get FuSoYa',
  char_kain: 'Get Kain',
  char_palom: 'Get Palom',
  char_porom: 'Get Porom',
  char_rosa: 'Get Rosa',
  char_rydia: 'Get Rydia',
  char_tellah: 'Get Tellah',
  char_yang: 'Get Yang',
  boss_antlion: 'Defeat Antlion',
  boss_asura: 'Defeat Asura',
  boss_bahamut: 'Defeat Bahamut',
  boss_baigan: 'Defeat Baigan',
  boss_calbrena: 'Defeat Calbrena',
  boss_cpu: 'Defeat CPU',
  boss_darkelf: 'Defeat Dark Elf',
  boss_darkimp: 'Defeat Dark Imps',
  boss_dlunar: 'Defeat D.Lunars',
  boss_dmist: 'Defeat D.Mist',
  boss_elements: 'Defeat Elements',
  boss_evilwall: 'Defeat EvilWall',
  boss_fabulgauntlet: 'Defeat Fabul Gauntlet',
  boss_golbez: 'Defeat Golbez',
  boss_guard: 'Defeat Baron Guards',
  boss_kainazzo: 'Defeat Kainazzo',
  boss_karate: 'Defeat Karate',
  boss_kingqueen: 'Defeat K/Q Eblan',
  boss_leviatan: 'Defeat Leviatan',
  boss_lugae: 'Defeat Dr. Lugae',
  boss_magus: 'Defeat Magus Sisters',
  boss_milon: 'Defeat Milon',
  boss_milonz: 'Defeat Milon Z.',
  boss_mirrorcecil: 'Defeat D.Knight',
  boss_mombomb: 'Defeat MomBomb',
  boss_octomamm: 'Defeat Octomamm',
  boss_odin: 'Defeat Odin',
  boss_officer: 'Defeat Officer',
  boss_ogopogo: 'Defeat Ogopogo',
  boss_paledim: 'Defeat Pale Dim',
  boss_plague: 'Defeat Plague',
  boss_rubicant: 'Defeat Rubicant',
  boss_valvalis: 'Defeat Valvalis',
  boss_waterhag: 'Defeat Waterhag',
  boss_wyvern: 'Defeat Wyvern',
  quest_antlionnest: 'Complete Antlion Nest',
  quest_baronbasement: 'Defeat Baron Basement',
  quest_baroncastle: 'Liberate Baron Castle',
  quest_baroninn: 'Defeat Baron Inn Bosses',
  quest_bigwhale: 'Raise Big Whale',
  quest_burnmist: 'Burn Mist with Package',
  quest_cavebahamut: 'Complete Cave Bahamut',
  quest_crystalaltar: 'Conquer Crystal Sword altar',
  quest_curefever: 'Cure Fever with SandRuby',
  quest_dwarfcastle: 'Defeat Dwarf Castle Bosses',
  quest_fabul: 'Defend Fabul',
  quest_falcon: 'Launch Falcon',
  quest_forge: 'Forge Legend Sword',
  quest_giant: 'Complete Giant of Bab-il',
  quest_hobs: 'Mt. Hobs - Rescue Hostage',
  quest_kaipoinn: 'Turn in Package',
  quest_lowerbabil: 'Defeat Lower Bab-il Boss',
  quest_magma: 'Drop Magma Key in Agart Well',
  quest_magnes: 'Complete Cave Magnes',
  quest_masamunealtar: 'Conquer Masamune altar',
  quest_mistcave: 'Defeat Mist Cave Boss',
  quest_monsterking: 'Defeat Monster King',
  quest_monsterqueen: 'Defeat Monster Queen',
  quest_murasamealtar: 'Conquer Murasame altar',
  quest_music: "Break Dark Elf's Spell (TwinHarp)",
  quest_ordeals: 'Complete Mt. Ordeals',
  quest_pass: 'Unlock Pass Door',
  quest_ribbonaltar: 'Conquer Ribbon room',
  quest_sealedcave: 'Complete Sealed Cave',
  quest_supercannon: 'Destroy Super Cannon',
  quest_toroiatreasury: 'Open Toroia Treasury',
  quest_tradepan: 'Return the Pan',
  quest_tradepink: 'Trade the Pink Tail',
  quest_traderat: 'Trade the Rat Tail',
  quest_unlocksealedcave: 'Unlock Sealed Cave',
  quest_unlocksewer: 'Unlock Sewer with Baron Key',
  quest_wakeyang: 'Wake Yang with Pan',
  quest_waterfall: 'Defeat Waterfall Boss',
  quest_whitealtar: 'Conquer White Spear altar',
  quest_zot: 'Complete Tower of Zot',
  internal_dkmatter: 'Dark Matter Count: {0}',
  internal_keyitem: 'Obtain {0} key items',
  internal_bossfight: 'Boss Count: {0}',
  internal_character: 'Character Count: {0}',
  internal_chest: 'Box Count: {0}',
  internal_gp: 'GP Count: {0}',
  objectives_a: 'Group A, Do: {0}',
  objectives_b: 'Group B, Do: {0}',
  objectives_c: 'Group C, Do: {0}',
  objectives_d: 'Group D, Do: {0}',
  objectives_e: 'Group E, Do: {0}',
};

// Mirrors ObjectiveDictionary.TryGetObjectiveText: formats a threshold with
// thousands separators only when it parses as a number (e.g. "all" passes
// through unchanged, matching the C# int.TryParse fallback behavior).
function formatThreshold(threshold) {
  const n = Number(threshold);
  if (threshold !== '' && threshold !== null && !Number.isNaN(n) && /^-?\d+$/.test(String(threshold))) {
    return n.toLocaleString('en-US');
  }
  return threshold;
}

function getObjectiveTextV5(taskId, threshold) {
  const template = OBJECTIVE_LOOKUP_V5[taskId];
  if (template === undefined) {
    console.warn(`[Alpha5] Unknown v5 objective id "${taskId}" - no display text in OBJECTIVE_LOOKUP_V5, showing raw id`);
    return taskId;
  }
  return template.replace('{0}', formatThreshold(threshold));
}

// Mirrors V5ObjectiveConverter.Read: each raw task is a plain string, a
// {objective, threshold} task, or a {group, req} cross-group reference.
function normalizeTaskV5(raw) {
  if (typeof raw === 'string') {
    return { kind: 'task', objective: raw, threshold: '1' };
  }
  if (raw && Object.prototype.hasOwnProperty.call(raw, 'group')) {
    return { kind: 'group', group: String(raw.group), req: String(raw.req) };
  }
  return { kind: 'task', objective: String(raw.objective), threshold: String(raw.threshold ?? '1') };
}

// Mirrors ObjectiveDictionary.GetReward's regex, for rewards that only carry
// a human `description` and no separate structured `reward` field.
const REWARD_TEXT_RE = /Complete ([\w]{1,3}) objectives? to win \[?([\w\s]+)\]?([\w\s]*)/;

function normalizeRewardV5(raw) {
  const description = raw.description ?? '';
  const match = description.match(REWARD_TEXT_RE);
  return {
    req: String(raw.req ?? (match ? match[1] : 'all')),
    reward: raw.reward ?? (match ? (match[3] || match[2]).trim() : ''),
    description,
  };
}

// Parses the raw `meta.objectives` array (already JSON.parse'd) into a
// normalized group list: [{ key, name, tasks: [...normalized], rewards: [...normalized] }]
function parseObjectiveGroupsV5(rawGroups) {
  if (!Array.isArray(rawGroups)) return [];
  return rawGroups.map((g) => ({
    key: g.key ?? '',
    name: g.name ?? '',
    tasks: Array.isArray(g.tasks) ? g.tasks.map(normalizeTaskV5) : [],
    rewards: Array.isArray(g.rewards) ? g.rewards.map(normalizeRewardV5) : [],
  }));
}

// Flattens normalized groups into the same flat "one entry per tracked task"
// shape objectives.js's buildObjectiveTasks() produces for v4.x, so the rest
// of the tracker (rendering) doesn't need two separate code paths yet.
// Order: groups in array order, tasks within a group in array order -
// PROVISIONAL, see file header re: WRAM byte alignment.
//
// A {group,req} cross-group reference (e.g. "Group B needs 4 of Group A
// done") is NOT a leaf objective with its own on-cartridge progress byte -
// it's a derived count over another group's own tasks. It is marked
// `isComputed: true` and excluded from `polledTasks` (the ones that should
// actually consume a WRAM progress-byte slot) so that future live-polling
// code doesn't misalign byte indices by reading a nonexistent byte for it.
// Its `current`/`isCompleted` must instead be recomputed from the completion
// state of the tasks in the group it references (see recomputeGroupRefs()).
function buildObjectiveTasksV5(rawGroups) {
  const groups = parseObjectiveGroupsV5(rawGroups);
  const tasks = [];
  let polledIndex = 0;
  for (const group of groups) {
    for (const task of group.tasks) {
      const isComputed = task.kind === 'group';
      const description = isComputed
        ? getObjectiveTextV5(task.group, task.req)
        : getObjectiveTextV5(task.objective, task.threshold);
      const target = isComputed
        ? (task.req === 'all' ? null /* resolved once the referenced group is known, see recomputeGroupRefs */ : Number(task.req))
        : (Number.isNaN(Number(task.threshold)) ? 1 : Number(task.threshold));
      tasks.push({
        index: tasks.length,
        polledIndex: isComputed ? null : polledIndex,
        description,
        type: isComputed ? 'groupRef' : task.objective,
        refGroupKey: isComputed ? task.group : null,
        target: isComputed ? target : (target || 1),
        current: 0,
        isCompleted: false,
        isComputed,
        isGated: false,
        isHardRequired: false,
        groupKey: group.key,
        groupName: group.name,
      });
      if (!isComputed) polledIndex++;
    }
  }
  return { tasks, groups, polledTaskCount: polledIndex };
}

// Recomputes every isComputed (group-reference) task's current/isCompleted
// from the completion state of the tasks in the group it points to. Call
// this after applying live WRAM progress bytes to the polled tasks.
function recomputeGroupRefs(tasks) {
  const byGroupKey = new Map();
  for (const task of tasks) {
    if (!byGroupKey.has(task.groupKey)) byGroupKey.set(task.groupKey, []);
    byGroupKey.get(task.groupKey).push(task);
  }
  for (const task of tasks) {
    if (!task.isComputed) continue;
    const referenced = (byGroupKey.get(task.refGroupKey) || []).filter((t) => !t.isComputed);
    const completedCount = referenced.filter((t) => t.isCompleted).length;
    if (task.target === null) task.target = referenced.length; // "all"
    task.current = completedCount;
    task.isCompleted = completedCount >= task.target;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OBJECTIVE_LOOKUP_V5,
    formatThreshold,
    getObjectiveTextV5,
    normalizeTaskV5,
    normalizeRewardV5,
    parseObjectiveGroupsV5,
    buildObjectiveTasksV5,
    recomputeGroupRefs,
    isAlpha5Version,
  };
}
