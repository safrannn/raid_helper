use log::error;
use types::{
    spell::{BossSpell, BossSpellType},
    time::Time,
    timeline::RaidDifficulty,
};
use utils::*;

// return (spell_id, spell_name, icon_url, spell_type)
pub fn get_boss_spell_info(spell_id: usize, boss_name: &String) -> Option<BossSpell> {
    // Connect to SQLite database
    let Some(db_connection) = connect_to_db() else {
        return None;
    };
    // Query and list all bosses by raid.
    let mut stmt = db_connection
        .prepare(
            format!(
                "SELECT name, icon, type 
                FROM boss_spell 
                WHERE spell_id={:?} AND boss_name={:?};",
                spell_id, boss_name
            )
            .as_str(),
        )
        .unwrap();

    let mut db_result = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .unwrap();

    db_result.next().and_then(
        |spell_info: Result<(String, String, String), rusqlite::Error>| {
            spell_info
                .map(|(name, icon, spell_type)| {
                    return BossSpell {
                        name,
                        id: spell_id,
                        icon,
                        spell_type: BossSpellType::from(spell_type),
                    };
                })
                .ok()
        },
    )
}

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

// todo!: add position here when implement boss map
pub fn get_timeline_boss_spells(
    boss_name: String,
    raid_difficulty: String,
) -> Vec<TimelineBossSpellsReturn> {
    // Connect to SQLite database
    let Some(db_connection) = connect_to_db() else {
        return vec![];
    };
    // Query and list all bosses by raid.
    let mut stmt = db_connection
        .prepare(
            format!(
                "SELECT keyframe_group_id, spell_id, start_time_in_sec, spell_duration 
                    FROM timeline_entry 
                    WHERE boss_name={:?} AND raid_difficulty={:?};",
                boss_name, raid_difficulty
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

pub fn get_player_timeline() {}
