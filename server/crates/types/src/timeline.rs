use crate::{class::*, spell::*, time::*};

pub struct Player {
    // Player name.
    name: String,
    // Player class spec information.
    class: PlayerClassSpec,
    // using class spec icon as player icon so no icon field.
}

pub struct Boss {
    // Name of the boss.
    name: String,
    // Name of the raid.
    raid: String,
    // Url of the icon image.
    icon: String,
}

// Position on the boss map
pub struct Position {
    // X position on the boss map. // todo!: consider replace it with gsap compatible data
    x_pos: usize,
    // Y position on the boss map. // todo!: consider replace it with gsap compatible data
    y_pos: usize,
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
pub enum Difficulty {
    Normal,
    Heroic,
    Mythic,
    Other,
}
impl From<&str> for Difficulty {
    fn from(difficulty_string: &str) -> Self {
        match difficulty_string {
            "Normal" | "normal" => Difficulty::Normal,
            "Heroic" | "heroic " => Difficulty::Heroic,
            "Mythic" | "mythic" => Difficulty::Mythic,
            _ => Difficulty::Other,
        }
    }
}

// Entry in each row in the timeline. Used for both timeline graph and boss map.
pub struct TimelineEntry {
    pub keyframe_group_id: usize,
    pub boss_name: String,
    pub difficulty: Difficulty,
    pub player_id: Option<usize>,
    pub spell_id: usize,
    pub start_cast: Time,
    pub spell_duration: f32,
    pub position: Option<Position>,
}
