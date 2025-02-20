// ==================Player====================

pub struct PlayerClass {
    // Player class, eg. Mage, Death Kight etc.
    name: String,
    // Url of the icon image.
    icon: String,
}

pub struct PlayerClassSpec {
    // Player class, eg. Mage, Death Kight etc.
    name: String,
    // Player class, eg. Fire Mage, Blood Death Kight, etc.
    class: PlayerClass,
    // Role of the current class, eg. tank, healer or dps.
    role: PlayerClassSpecRole,
    // Url of the icon image.
    icon: String,
}

pub enum PlayerClassSpecRole {
    Tank,
    Healer,
    DPS,
}

pub struct Player {
    // Player name.
    name: String,
    // Player class information.
    class: PlayerClassSpec,
    // using class spec icon as player icon.
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Boss {
    // Name of the boss.
    name: String,
    // Url of the icon.
    icon: String,
}

impl Boss {
    pub fn new(boss_name: String, boss_icon: String) -> Self {
        Boss {
            name: boss_name,
            icon: boss_icon,
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Raid {
    // Name of the raid.
    name: String,
    // Bosses of the raid
    boss: Vec<Boss>,
}

impl Raid {
    pub fn new(name: String) -> Self {
        Raid {
            name,
            boss: Vec::new(),
        }
    }
    pub fn add_boss(&mut self, boss: Boss) {
        self.boss.push(boss);
    }
}
