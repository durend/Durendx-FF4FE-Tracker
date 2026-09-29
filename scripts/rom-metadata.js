// rom-metadata.js
// Reads the JSON metadata block the Galeswift/FE patcher embeds directly in
// the ROM (FreeEnt/generator.py, ~line 1082): a 4-byte little-endian length
// prefix at unheadered 0x1FF000, followed by that many bytes of UTF-8 JSON
// at 0x1FF004. Confirmed present on current DoorsRando/v4.6.4 source.
//
// This is a two-stage read (length, then exact payload) specifically to fix
// the bug in the old tracker: it read one fixed 0x400-byte window and choked
// (silent JSON.parse failure + regex fallback) on any seed whose metadata
// didn't fit - which happens with larger objective lists.
//
// JSON shape (metadata_doc in generator.py):
//   { version, flags, binary_flags, seed, objectives? }
// `objectives` is a flat array of pre-rendered description strings with any
// counts already baked in by the patcher (e.g. "Defeat 20 bosses",
// "Bring 25 DkMatters to Kory in Agart") - see objective_rando.py ~line 1030.
// There is no separate structured threshold table to read from ROM; the
// count lives in the text itself. See objectives.js for how that's parsed
// back out, mirroring what Kyuuden's Companion tracker does
// (GaleswiftFork/Objectives.cs: `Regex.Match(description, "Defeat (\\d*) bosses")`).

const RomMetadata = {
  LENGTH_OFFSET: 0x1FF000,
  PAYLOAD_OFFSET: 0x1FF004,
};

async function readRomMetadata(snesClient) {
  const lengthBytes = await snesClient.readRom(RomMetadata.LENGTH_OFFSET, 4);
  const length = lengthBytes[0] | (lengthBytes[1] << 8) | (lengthBytes[2] << 16) | (lengthBytes[3] << 24);

  if (!length || length <= 0 || length > 0x10000) {
    throw new Error(`Implausible metadata length: ${length} - is a seed actually loaded?`);
  }

  const payloadBytes = await snesClient.readRom(RomMetadata.PAYLOAD_OFFSET, length);
  const json = new TextDecoder('utf-8').decode(payloadBytes);

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`Failed to parse ROM metadata JSON (read ${length} bytes): ${e.message}`);
  }

  return {
    version: parsed.version ?? null,
    flags: parsed.flags && parsed.flags !== '(hidden)' ? parsed.flags.toUpperCase() : null,
    isHidden: parsed.flags === '(hidden)',
    binaryFlags: parsed.binary_flags ?? null,
    seed: parsed.seed ?? null,
    // Plain description strings in slot order, or null if the patcher didn't
    // embed an objective list for this seed (e.g. no objectives enabled).
    objectives: Array.isArray(parsed.objectives) ? parsed.objectives : null,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { readRomMetadata, RomMetadata };
}
