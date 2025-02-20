use crate::{class::*, spell::*, time::*};
use std::collections::{HashMap, HashSet};

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

pub enum TimelineEntrySpell {
    Player(PlayerSpell),
    Boss(BossSpell),
}

// Each entry in the timeline graph and boss map.
pub enum TimelineEntryKind {
    // cast_start_min, cast_start_sec, cast_time.
    SpellCasts {
        spell_id: usize,
        spell_cast: SpellCast,
    },
    // Position on the boss map.
    MapPosition {
        x: Position,
        y: Position,
    },
}

pub enum TimelineEntryEntity {
    Player(Player),
    Boss(Boss),
}
pub struct Timeline {
    fight_id: usize,

    // <EntryID, TimelineEntryKind>
    entries: HashMap<usize, TimelineEntryKind>,
}

// ==================Boss Map====================
// Position on the boss map
struct Position {
    // X position on the boss map. // todo!: consider replace it with gsap compatible data
    x_pos: usize,
    // Y position on the boss map. // todo!: consider replace it with gsap compatible data
    y_pos: usize,
}
