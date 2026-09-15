import type { DataGroup, DataItem } from "vis-timeline/standalone";
import {
  BossSpell,
  BossSpellMap,
  TimelineBossSpellsReturn,
  TimelinePlayerListWSpellCasts,
} from "@/app/types";

// Timeline scale settings (values are in ms).
export const ROW_SIZE = 40;
export const SNAP_STEP_MS = 2500;
export const INITIAL_VISIBLE_MS = 60_000;
export const FIGHT_LENGTH_MS = 900_000;
export const FRAME_RATE = 1000; // server sends seconds, timeline works in ms
export const PLAYHEAD_ID = "playhead";
// Permanent last row in the label column: opens the add-player dialog once an
// encounter is selected, otherwise a placeholder that keeps the column shown.
export const ADD_PLAYER_GROUP_ID = "__add_player__";
// Range items shorter than this only show their icon, not the spell name.
export const LABEL_MIN_MS = 5000;

// Row id conventions are unchanged from createRow.ts so anything that parses
// them (boss__{name}__{difficulty}, player__{name}__{id}__{class}__{spec})
// keeps working.
export const bossRowId = (bossName: string, difficulty: string) =>
  `boss__${bossName}__${difficulty}`;
export const playerRowId = (
  name: string,
  id: number,
  className: string,
  specName: string,
) => `player__${name}__${id}__${className}__${specName}`;

// Encounter time is "ms since pull"; vis-timeline works in Dates, so epoch 0
// is the pull and the axis is formatted as mm:ss by us.
export const formatFightTime = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 100) / 10);
  const m = Math.floor(total / 60);
  const s = (total % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
};

// vis hands axis/snap callbacks moment objects (standalone build) rather than
// Dates; `valueOf()` yields epoch ms for either.
export const formatAxisLabel = (date: Date) => {
  const ms = date.valueOf();
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// ---- vis model -------------------------------------------------------------

// Spell metadata lives directly on the item instead of being packed into the
// "groupId__spellId__iconUrl" string the canvas lib required.
export interface SpellItem extends DataItem {
  id: string;
  group: string;
  start: number;
  end?: number;
  spellId: number;
  spellName: string;
  spellIcon: string;
  color: string;
}

export interface RowGroup extends DataGroup {
  id: string;
  kind: "boss" | "player" | "add" | "placeholder";
  name: string;
  subtitle: string;
  color: string;
  // Lookup key into the store's icon maps (boss name, or class__spec).
  iconKey: string;
}

const CLASS_COLORS: Record<string, string> = {
  deathknight: "#C41E3A",
  demonhunter: "#A330C9",
  druid: "#FF7C0A",
  evoker: "#33937F",
  hunter: "#AAD372",
  mage: "#3FC7EB",
  monk: "#00FF98",
  paladin: "#F48CBA",
  priest: "#FFFFFF",
  rogue: "#FFF468",
  shaman: "#0070DD",
  warlock: "#8788EE",
  warrior: "#C69B6D",
};
const BOSS_COLOR = "#f31260";
const DEFAULT_COLOR = "#a1a1aa";

export const classColor = (className: string) =>
  CLASS_COLORS[className.replace(/\s+/g, "").toLowerCase()] ?? DEFAULT_COLOR;

// The boss endpoint serialises the duration as `duration`, the player endpoint
// as `spell_duration`; accept either.
interface CastLike {
  keyframe_group_id: number;
  spell_id: number;
  spell_name: string;
  spell_icon: string;
  start_cast: number;
  spell_duration?: number;
  duration?: number;
}

export const castToItem = (group: RowGroup, c: CastLike): SpellItem => {
  const start = Math.round(c.start_cast * FRAME_RATE);
  const duration = c.spell_duration ?? c.duration ?? 0;
  const instant = duration === 0;
  return {
    id: `${group.id}__${c.keyframe_group_id}`,
    group: group.id,
    // "box" centres the icon on `start`; "range" spans start..end.
    type: instant ? "box" : "range",
    start,
    end: instant ? undefined : start + Math.round(duration * FRAME_RATE),
    content: c.spell_name,
    title: `${c.spell_name} @ ${formatFightTime(start)}`,
    className: instant
      ? "spell-instant"
      : `spell-range${duration * FRAME_RATE < LABEL_MIN_MS ? " spell-short" : ""}`,
    // Inline style lands on the .vis-item element itself, where the CSS for
    // the range bar reads the colour.
    style: `--spell-color: ${group.color}`,
    spellId: c.spell_id,
    spellName: c.spell_name,
    spellIcon: c.spell_icon,
    color: group.color,
  };
};

export const bossRowGroup = (
  bossName: string,
  difficulty: string,
): RowGroup => ({
  id: bossRowId(bossName, difficulty),
  content: bossName,
  className: "row-boss",
  kind: "boss",
  name: bossName,
  subtitle: difficulty,
  color: BOSS_COLOR,
  iconKey: bossName,
});

export const playerRowGroup = (
  name: string,
  id: number,
  className: string,
  specName: string,
): RowGroup => ({
  id: playerRowId(name, id, className, specName),
  content: name,
  className: "row-player",
  kind: "player",
  name,
  subtitle: specName === "*" ? className : `${specName} ${className}`,
  color: classColor(className),
  iconKey: specName === "*" ? className : `${className}__${specName}`,
});

// ---- Loaders ---------------------------------------------------------------

export interface LoadedRows {
  groups: RowGroup[];
  items: SpellItem[];
}

const fightUrl = (path: string, bossName: string, difficulty: string) => {
  const params = new URLSearchParams({ boss_name: bossName, difficulty });
  return encodeURI(`http://localhost:3001/${path}?` + params.toString());
};

export const loadBossRow = async (
  bossName: string,
  difficulty: string,
): Promise<
  LoadedRows & { bossSpellMap: BossSpellMap; hiddenSpellIds: number[] }
> => {
  const response = await fetch(
    fightUrl("get_timeline_boss_spells", bossName, difficulty),
  );
  const data: TimelineBossSpellsReturn[] = await response.json();

  const group = bossRowGroup(bossName, difficulty);
  const bossSpellMap: BossSpellMap = new Map();
  const hidden = new Set<number>();
  const items = data.map((cast) => {
    bossSpellMap.set(
      cast.spell_id,
      new BossSpell(
        cast.spell_name,
        cast.spell_id,
        cast.spell_icon,
        cast.spell_type.replace(/"/g, ""),
        cast.visibility,
      ),
    );
    if (!cast.visibility) hidden.add(cast.spell_id);
    return castToItem(group, cast);
  });

  return { groups: [group], items, bossSpellMap, hiddenSpellIds: [...hidden] };
};

export const loadPlayerRows = async (
  bossName: string,
  difficulty: string,
): Promise<LoadedRows> => {
  const response = await fetch(
    fightUrl("get_timeline_player_list_w_spell_casts", bossName, difficulty),
  );
  const data: TimelinePlayerListWSpellCasts[] = await response.json();

  const groups: RowGroup[] = [];
  const items: SpellItem[] = [];
  for (const { player, spell_casts } of data) {
    const group = playerRowGroup(
      player.name,
      player.id,
      player.class_name,
      player.spec_name,
    );
    groups.push(group);
    for (const cast of spell_casts) items.push(castToItem(group, cast));
  }
  return { groups, items };
};
