use crate::{boss::get_boss_spell_info, player::get_player_spell};
use rusqlite::Connection;
use types::characters::Player;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct TimelineBossSpellsReturn {
    pub keyframe_group_id: usize,
    pub spell_id: usize,
    pub spell_name: String,
    pub start_cast: f32,
    pub duration: f32,
    pub spell_icon: String,
    pub spell_type: String,
    pub visibility: bool,
}

pub fn get_timeline_boss_spell_by_spell_id(
    conn: &mut Connection,
    boss_name: String,
    difficulty: String,
    spell_id: usize,
) -> Vec<TimelineBossSpellsReturn> {
    let mut stmt = conn
        .prepare(
            format!(
                "SELECT keyframe_group_id, start_time_in_sec, duration, visibility
                    FROM boss_timeline_entry 
                    WHERE boss_name={:?} AND difficulty={:?} AND spell_id={:?};",
                boss_name, difficulty, spell_id
            )
            .as_str(),
        )
        .unwrap();

    let db_result_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, usize>(0)?,
                row.get::<_, f32>(1)?,
                row.get::<_, f32>(2)?,
                row.get::<_, bool>(3)?,
            ))
        })
        .unwrap();
    let mut result = Vec::new();
    for spell in db_result_iter {
        if let Ok((keyframe_group_id, start_time_in_sec, duration, visibility)) = spell {
            if let Some(boss_spell_info) = get_boss_spell_info(spell_id, &boss_name) {
                result.push(TimelineBossSpellsReturn {
                    keyframe_group_id,
                    spell_id,
                    spell_name: boss_spell_info.name,
                    start_cast: start_time_in_sec,
                    duration,
                    spell_icon: boss_spell_info.icon,
                    spell_type: format!("{:?}", boss_spell_info.spell_type),
                    visibility,
                })
            }
        }
    }
    result
}

// todo!: add position here when implementing boss map
pub fn get_timeline_boss_spells(
    conn: &mut Connection,
    boss_name: String,
    difficulty: String,
) -> Vec<TimelineBossSpellsReturn> {
    let mut stmt = conn
        .prepare(
            format!(
                "SELECT keyframe_group_id, spell_id, start_time_in_sec, duration, visibility
                    FROM boss_timeline_entry 
                    WHERE boss_name={:?} AND difficulty={:?};",
                boss_name, difficulty
            )
            .as_str(),
        )
        .unwrap();

    let db_result_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, usize>(0)?,
                row.get::<_, usize>(1)?,
                row.get::<_, f32>(2)?,
                row.get::<_, f32>(3)?,
                row.get::<_, bool>(4)?,
            ))
        })
        .unwrap();

    let mut result = Vec::new();
    for spell in db_result_iter {
        if let Ok((keyframe_group_id, spell_id, start_time_in_sec, duration, visibility)) = spell {
            if let Some(boss_spell_info) = get_boss_spell_info(spell_id, &boss_name) {
                result.push(TimelineBossSpellsReturn {
                    keyframe_group_id,
                    spell_id,
                    spell_name: boss_spell_info.name,
                    start_cast: start_time_in_sec,
                    duration,
                    spell_icon: boss_spell_info.icon,
                    spell_type: format!("{:?}", boss_spell_info.spell_type),
                    visibility,
                })
            }
        }
    }
    result
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct TimelinePlayerSpellsReturn {
    pub keyframe_group_id: usize,
    pub spell_id: usize,
    pub spell_name: String,
    pub spell_class_name: String,
    pub spell_spec_name: String,
    pub start_cast: f32,
    pub spell_duration: usize,
    pub spell_type: String,
    pub spell_icon: String,
    pub visibility: bool,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct TimelinePlayerListWSpellCasts {
    pub player: Player,
    pub spell_casts: Vec<TimelinePlayerSpellsReturn>,
}

// todo!: add position here when implementing boss map
pub fn get_timeline_player_list_w_spell_casts(
    conn: &mut Connection,
    boss_name: String,
    difficulty: String,
) -> Vec<TimelinePlayerListWSpellCasts> {
    let mut stmt = conn
        .prepare(
            format!(
                "SELECT name, id, class_name, spec_name
                    FROM player_list 
                    WHERE boss_name={boss_name:?} AND difficulty={difficulty:?};",
            )
            .as_str(),
        )
        .unwrap();

    let db_result_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, usize>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .unwrap();

    let mut player_list: Vec<Player> = vec![];
    for player in db_result_iter {
        if let Ok((name, id, class_name, spec_name)) = player {
            player_list.push(Player {
                name,
                id,
                class_name,
                spec_name,
            });
        }
    }

    let mut player_list_w_spell_casts: Vec<TimelinePlayerListWSpellCasts> = vec![];

    for player in player_list {
        let player_id = player.id;
        let mut player_spell_casts = vec![];
        let mut stmt = conn
            .prepare(
                format!(
                    "SELECT keyframe_group_id, spell_id, start_time_in_sec, visibility
                        FROM player_timeline_entry 
                        WHERE player_id={player_id:?};",
                )
                .as_str(),
            )
            .unwrap();
        let db_result_iter = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, usize>(0)?,
                    row.get::<_, usize>(1)?,
                    row.get::<_, f32>(2)?,
                    row.get::<_, bool>(3)?,
                ))
            })
            .unwrap();
        for spell_cast in db_result_iter {
            if let Ok((keyframe_group_id, spell_id, start_cast, visibility)) = spell_cast {
                if let Some(spell_info) = get_player_spell(spell_id) {
                    player_spell_casts.push(TimelinePlayerSpellsReturn {
                        keyframe_group_id,
                        spell_id,
                        spell_name: spell_info.name,
                        spell_class_name: spell_info.class_name,
                        spell_spec_name: spell_info.spec_name,
                        start_cast,
                        spell_duration: spell_info.duration,
                        spell_type: spell_info.spell_type,
                        spell_icon: spell_info.icon,
                        visibility,
                    });
                };
            }
        }
        player_list_w_spell_casts.push(TimelinePlayerListWSpellCasts {
            player,
            spell_casts: player_spell_casts,
        });
    }

    player_list_w_spell_casts
}
