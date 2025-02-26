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
struct Position {
    // X position on the boss map. // todo!: consider replace it with gsap compatible data
    x_pos: usize,
    // Y position on the boss map. // todo!: consider replace it with gsap compatible data
    y_pos: usize,
}

// Entry in each row in the timeline. Used for both timeline graph and boss map.
pub struct TimelineEntry {
    pub boss_name: String,

    pub player_id: Option<usize>,

    pub time_stamp: Time,

    // Option<(spell_id, cast_duration)>.
    pub cast: Option<(usize, f32)>,

    // position in the boss map.
    pub position: Option<Position>,
}

impl TimelineEntry {
    pub fn new_cast(
        boss_name: String,
        player_id: Option<usize>,
        time_stamp: Time,
        spell_id: usize,
        cast_duration: f32,
    ) -> Self {
        TimelineEntry {
            boss_name,
            player_id,
            time_stamp,
            cast: Some((spell_id, cast_duration)),
            position: None,
        }
    }
    pub fn new_position(
        boss_name: String,
        player_id: Option<usize>,
        time_stamp: Time,
        position: Position,
    ) -> Self {
        TimelineEntry {
            boss_name,
            player_id,
            time_stamp,
            cast: None,
            position: Some(position),
        }
    }
}
