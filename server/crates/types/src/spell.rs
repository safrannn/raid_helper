use crate::class::*;
use crate::time::*;
use rusqlite::{
    types::{ToSql, ToSqlOutput},
    Result,
};

// ==================Spell Commons====================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SpellCast {
    // Start casting time.
    cast_start: Time,
    // Time taken for casting in seconds.
    cast_time: f32,
}

impl SpellCast {
    pub fn new(cast_start: Time, cast_time: f32) -> Self {
        SpellCast {
            cast_start,
            cast_time,
        }
    }
}
// sql table: key:id, name.......
pub struct PlayerSpell {
    // Spell name.
    name: String,
    // Spell id.
    id: usize,
    // Url of the icon image.
    icon: String,
    // Class of the caster.
    class: PlayerClass,
    // Spell cool down in seconds.
    cool_down: f32,
    // Cast time in seconds
    cast_time: f32,
    // Spell type note for spell filter.
    spell_type: PlayerSpellType,
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct BossSpell {
    // Spell name.
    pub name: String,
    // Spell id.
    pub id: usize,
    // Url of the icon image.
    pub icon: String,
    // Spell type note for spell filter.
    pub spell_type: BossSpellType,
}
impl BossSpell {
    pub fn default(name: String) -> Self {
        BossSpell {
            name,
            id: 0,
            icon: "www.wowhead.com/icon=".to_string(),
            spell_type: BossSpellType::Default,
        }
    }
}
pub enum PlayerSpellType {
    Default,
    BurstDamage,
    Movement,
    PersonalDefense,
    RaidDefense,
    SingleTargetHeal,
    RaidHeal,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub enum BossSpellType {
    Default,
    Defense,
    SingleTargetDamange,
    RaidDamage,
    SpecialMechanics,
}

impl ToSql for BossSpellType {
    fn to_sql(&self) -> Result<ToSqlOutput<'_>> {
        Ok(ToSqlOutput::from(format!("{:?}", self)))
    }
}
