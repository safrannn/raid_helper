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
    pub fn new(name: String, icon: String) -> Self {
        Boss { name, icon }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Raid {
    // Name of the raid.
    name: String,
    // Patch of the raid.
    patch: String,
}

impl Raid {
    pub fn new(name: String, patch: String) -> Self {
        Raid { name, patch }
    }
}
