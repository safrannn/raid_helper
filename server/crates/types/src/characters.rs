// ==================Player====================
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Player {
    pub name: String,
    pub id: usize, // Player ID in DB.
    pub class_name: String,
    pub spec_name: String, // using class spec icon as player icon.
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Boss {
    name: String,
    icon: String,
}

impl Boss {
    pub fn new(name: String, icon: String) -> Self {
        Boss { name, icon }
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Raid {
    name: String,
    patch: String,
}

impl Raid {
    pub fn new(name: String, patch: String) -> Self {
        Raid { name, patch }
    }
}
