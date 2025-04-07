use crate::boss::get_boss_spell_info;
use rusqlite::Connection;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct TimelineBossSpellsReturn {
    pub keyframe_group_id: usize,
    pub spell_id: usize,
    pub spell_name: String,
    pub start_cast: f32,
    pub spell_duration: f32,
    pub icon_url: String,
    pub spell_type: String,
}

pub fn get_timeline_boss_spell_by_spell_id(
    conn: &mut Connection,
    boss_name: String,
    difficulty: String,
    spell_id: usize,
) -> Vec<TimelineBossSpellsReturn> {
    // Query and list all bosses by raid.
    let mut stmt = conn
        .prepare(
            format!(
                "SELECT keyframe_group_id, start_time_in_sec, spell_duration 
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
            ))
        })
        .unwrap();
    let mut result = Vec::new();
    for spell in db_result_iter {
        if let Ok((keyframe_group_id, start_time_in_sec, spell_duration)) = spell {
            if let Some(boss_spell_info) = get_boss_spell_info(spell_id, &boss_name) {
                result.push(TimelineBossSpellsReturn {
                    keyframe_group_id,
                    spell_id,
                    spell_name: boss_spell_info.name,
                    start_cast: start_time_in_sec,
                    spell_duration,
                    icon_url: boss_spell_info.icon,
                    spell_type: format!("{:?}", boss_spell_info.spell_type),
                })
            }
        }
    }
    result
}

// todo!: add position here when implement boss map
pub fn get_timeline_boss_spells(
    conn: &mut Connection,
    boss_name: String,
    difficulty: String,
) -> Vec<TimelineBossSpellsReturn> {
    // Query and list all bosses by raid.
    let mut stmt = conn
        .prepare(
            format!(
                "SELECT keyframe_group_id, spell_id, start_time_in_sec, spell_duration 
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
            ))
        })
        .unwrap();

    let mut result = Vec::new();
    for spell in db_result_iter {
        if let Ok((keyframe_group_id, spell_id, start_time_in_sec, spell_duration)) = spell {
            if let Some(boss_spell_info) = get_boss_spell_info(spell_id, &boss_name) {
                result.push(TimelineBossSpellsReturn {
                    keyframe_group_id,
                    spell_id,
                    spell_name: boss_spell_info.name,
                    start_cast: start_time_in_sec,
                    spell_duration,
                    icon_url: boss_spell_info.icon,
                    spell_type: format!("{:?}", boss_spell_info.spell_type),
                })
            }
        }
    }
    result
}
