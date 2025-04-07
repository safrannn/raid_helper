#[derive(Debug, Clone, Hash, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
pub struct PlayerSpell {
    // Spell id.
    pub spell_id: usize,
    // Spell name.
    pub name: String,
    // Class of the caster.
    pub class_name: String,
    // Spec of the caster's class
    pub spec_name: String,
    // Spell cool down in seconds.
    pub cool_down: usize,
    // Cast time/duration in seconds
    pub cast_duration: usize,
    // Spell type note for spell filter.
    pub spell_type: String,
    // Url of the icon image.
    pub icon: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct PlayerSpellsByClassSpec {
    pub class_name: String,
    pub spells_by_spec: Vec<PlayerSpellsBySpec>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct PlayerSpellsBySpec {
    pub spec_name: String,
    pub spells: Vec<PlayerSpell>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct BossSpell {
    // Spell name.
    pub name: String,
    // Spell id.
    pub id: usize,
    // Url of the icon image.
    pub icon: String,
    // Spell type note for spell filter.
    pub spell_type: String,
    pub visibility: bool,
}

impl BossSpell {
    pub fn default(name: String) -> Self {
        BossSpell {
            name,
            id: 0,
            icon: "www.wowhead.com/icon=".to_string(),
            spell_type: "Default".to_string(),
            visibility: true,
        }
    }
}
