export class Raid {
  name: string;
  patch: string;

  constructor(name: string, patch: string) {
    this.name = name;
    this.patch = patch;
  }
}

export class Boss {
  name: string;
  icon: string;

  constructor(name: string, icon: string) {
    this.name = name;
    this.icon = icon;
  }
}

// <boss_name, {boss_icon, raid_name}>
export type BossMap = Map<string, { bossIcon: string; raidName: string }>;
export type BossSpellMap = Map<number, BossSpell>; // number: spellId

export class BossSpell {
  name: string;
  id: number;
  icon: string;
  spell_type: string;
  visibility: boolean;
  constructor(
    name: string,
    id: number,
    icon: string,
    spell_type: string,
    visibility: boolean
  ) {
    this.name = name;
    this.id = id;
    this.icon = icon;
    this.spell_type = spell_type;
    this.visibility = visibility;
  }
}

// Map<class_name + '_' + spec_name, icon>
export type PlayerClassSpecIconMap = Map<string, string>;

export type PlayerSpellsByClass = {
  class_name: string;
  spells_by_spec: PlayerSpellsBySpec[];
};

export type PlayerSpellsBySpec = {
  spec_name: string;
  spells: PlayerSpell[];
};

export class PlayerSpell {
  name: string;
  spell_id: number;
  icon: string;
  class_name: string;
  spec_name: string;
  cool_down: number;
  cast_duration: number;
  spell_type: string;

  constructor(
    name: string,
    spell_id: number,
    icon: string,
    class_name: string,
    spec_name: string,
    cool_down: number,
    cast_duration: number,
    spell_type: string
  ) {
    this.name = name;
    this.spell_id = spell_id;
    this.icon = icon;
    this.class_name = class_name;
    this.spec_name = spec_name;
    this.cool_down = cool_down;
    this.cast_duration = cast_duration;
    this.spell_type = spell_type;
  }
}

export class TimelineBossSpellsReturn {
  keyframe_group_id: number;
  spell_id: number;
  spell_name: string;
  start_cast: number;
  spell_duration: number;
  icon_url: string;
  spell_type: string;

  constructor(
    keyframe_group_id: number,
    spell_id: number,
    spell_name: string,
    start_cast: number,
    spell_duration: number,
    icon_url: string,
    spell_type: string
  ) {
    this.keyframe_group_id = keyframe_group_id;
    this.spell_id = spell_id;
    this.spell_name = spell_name;
    this.start_cast = start_cast;
    this.spell_duration = spell_duration;
    this.icon_url = icon_url;
    this.spell_type = spell_type;
  }
}
