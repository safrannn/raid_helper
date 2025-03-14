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
export class BossByRaid{
  boss_name: string;
  boss_icon: string;
  raid_name: string;

  constructor(boss_name:string, boss_icon:string, raid_name: string) {
    this.boss_name = boss_name;
    this.boss_icon = boss_icon;
    this.raid_name = raid_name;
  }
}

export enum BossSpellType {
  Default="Default",
  Defense="Defense",
  SingleTargetDamange="SingleTargetDamange",
  RaidDamage="RaidDamage",
  SpecialMechanics="SpecialMechanics",
}

export class TimelineBossSpellsReturn{
  keyframe_group_id: number;
  spell_id: number;
  spell_name: string;
  start_cast: number;
  spell_duration: number;
  icon_url: string;
  spell_type: string;

  constructor(
    keyframe_group_id: number, 
    spell_id :number, 
    spell_name: string, 
    start_cast: number, 
    spell_duration: number, 
    icon_url: string, 
    spell_type: string
  ){
    this.keyframe_group_id = keyframe_group_id;
    this.spell_id = spell_id;
    this.spell_name = spell_name;
    this.start_cast = start_cast;
    this.spell_duration = spell_duration;
    this.icon_url = icon_url;
    this.spell_type = spell_type;
  }
}