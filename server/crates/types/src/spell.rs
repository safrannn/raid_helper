#[derive(Debug, Clone, Hash, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
pub struct PlayerSpell {
    pub id: usize, // wow spell id
    pub name: String,
    pub class_name: String,
    pub spec_name: String,
    pub cool_down: usize, // spell cool down in seconds
    pub duration: usize,  // cast time/duration in seconds
    pub spell_type: String,
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
    pub name: String,
    pub id: usize, // wow spell id
    pub icon: String,
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
