use log::*;
use rusqlite::{params, Connection, Result};
use std::{
    fs::*,
    io::Read,
    path::{Path, PathBuf},
};

use types::{
    spell::*,
    time::*,
    timeline::{Difficulty, TimelineEntry},
};
use utils::*;

// import database/source_data/boss_timeline.csv into sqlite
pub fn import_boss_timeline(conn: &mut Connection) {
    // Import csv file downloaded from warcraftlogs.com
    let boss_timeline_path = "/boss_timeline";
    let mut source_boss_timeline = SOURCE_DATA.to_string();
    source_boss_timeline.push_str(boss_timeline_path);
    for entry in read_dir(Path::new(source_boss_timeline.as_str()))
        .expect("Error while reading boss timeline directory.")
    {
        match entry {
            Ok(raid_dir) => {
                let raid_dir = raid_dir.path();
                let raid_name_found = raid_dir
                    .as_path()
                    .file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or_default();
                if if_raid_exist(raid_name_found) {
                    for entry in read_dir(raid_dir.clone())
                        .expect("Error while reading boss timeline directory.")
                    {
                        match entry {
                            Ok(dir) => {
                                // Validate file name. Expected: <BossName>_<Difficulty>.csv
                                let path = dir.path();
                                let Some((boss_name, difficulty)) =
                                    validate_boss_file_name(&path, "csv")
                                else {
                                    continue;
                                };

                                // Boss spell source data format: [Time, Type, Ability, Source -> Target...]
                                let Ok(mut reader) = csv::Reader::from_path(path.clone()) else {
                                    error!("Error reading boss fight timeline file as .csv file.");
                                    continue;
                                };

                                // create TimelineEntrySpell -> timeline entry
                                // Parse data into <SpellName, [SpellCasts]>
                                let mut timeline_entries: Vec<TimelineEntry> = Vec::new();
                                for record in reader.records() {
                                    if let Ok(record) = record {
                                        let start_cast = record
                                            .get(0)
                                            .map(Time::from)
                                            .unwrap_or_else(|| Time::new(0.0));
                                        let spell_type = record.get(1).unwrap_or_default();
                                        let ability_string = record.get(2).unwrap_or_default();

                                        let Some((spell_name, spell_duration)) =
                                            parse_boss_ability_string(ability_string, spell_type)
                                        else {
                                            continue;
                                        };
                                        let Some(spell_id) =
                                            get_boss_spell_id(boss_name, spell_name)
                                        else {
                                            error!(
                                                "Unable to get boss spell id from boss_spell_list"
                                            );
                                            continue;
                                        };
                                        let timeline_entry = TimelineEntry {
                                            keyframe_group_id: 0, // not used
                                            boss_name: boss_name.to_string(),
                                            difficulty: difficulty.clone(),
                                            player_id: None,
                                            spell_id,
                                            start_cast,
                                            spell_duration,
                                            position: None,
                                        };
                                        timeline_entries.push(timeline_entry);
                                    }
                                }

                                for timeline_entry in timeline_entries.iter() {
                                    // Store  store timeline_entry into timeline_entry table.
                                    let mut stmt = conn
                                    .prepare(format!("INSERT OR IGNORE into timeline_entry (boss_name, difficulty, start_time_in_sec, spell_id, spell_duration)
                                        VALUES ({:?}, {:?}, {:?}, {:?}, {:?});",
                                        boss_name,
                                        format!("{:?}", timeline_entry.difficulty),
                                        timeline_entry.start_cast.get_sec(),
                                        timeline_entry.spell_id,
                                        timeline_entry.spell_duration,
                                        ).as_str(),
                                    )
                                    .unwrap();
                                    let _ = stmt.execute([]);
                                }
                            }
                            Err(err) => {
                                error!("Error reading boss timeline boss dir: {err:?}");
                                continue;
                            }
                        }
                    }
                }
            }
            Err(err) => {
                error!("Error reading boss timeline raid dir: {err:?}");
                continue;
            }
        }
    }
}

// import boss spells info from json files into database.
pub fn import_boss_spells(conn: &mut Connection) {
    let boss_spell_path_by_raid = format!("{}/boss_spell", SOURCE_DATA.to_string());

    for entry in read_dir(Path::new(boss_spell_path_by_raid.as_str()))
        .expect("Error while reading boss spell directory.")
    {
        match entry {
            Ok(raid_dir) => {
                let raid_dir = raid_dir.path();
                let raid_name = raid_dir
                    .as_path()
                    .file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or_default();
                if if_raid_exist(raid_name) {
                    for entry in read_dir(raid_dir.clone())
                        .expect("Error while reading boss spell directory.")
                    {
                        match entry {
                            Ok(dir) => {
                                // Validate file name. Expected: <BossName>_<Difficulty>.csv
                                let path = dir.path();

                                let Some((boss_name, _difficulty)) =
                                    validate_boss_file_name(&path, "json")
                                else {
                                    continue;
                                };

                                // Read json source file: <BossSpellName, Vec<SpellCast>>.
                                let Ok(mut file) = File::open(&path) else {
                                    error!("Error reading boss spell file.");
                                    continue;
                                };
                                let mut json_result = String::new();
                                let _ = file.read_to_string(&mut json_result);

                                let Ok(boss_spells): Result<Vec<BossSpell>, _> =
                                    serde_json::from_str(&json_result)
                                else {
                                    error!("Error parsing boss spells.");
                                    continue;
                                };

                                for boss_spell in boss_spells {
                                    if let Err(err) = conn.execute(
                                        "INSERT OR IGNORE INTO boss_spell (spell_id, name, icon, type, boss_name) VALUES (?1, ?2, ?3, ?4, ?5);",
                                        params![&boss_spell.id, &boss_spell.name, &boss_spell.icon, boss_spell.spell_type, &boss_name],
                                    ){
                                        error!("boss_spell database table insert error: {err:?}. spell_id: {:?} | spell_name: {:?}", boss_spell.id, boss_spell.name);
                                    };
                                }
                            }
                            Err(err) => {
                                error!("Error reading boss timeline boss dir: {err:?}");
                                continue;
                            }
                        }
                    }
                }
            }
            Err(err) => {
                error!("Error reading boss timeline raid dir: {err:?}");
                continue;
            }
        }
    }
}

// ==================Utils====================
fn if_raid_exist(raid_name: &str) -> bool {
    let Some(conn) = connect_to_db() else {
        return false;
    };

    let mut stmt = conn
        .prepare(
            format!(
                "SELECT EXISTS ( SELECT 1 FROM raid_list WHERE name = {:?});",
                raid_name
            )
            .as_str(),
        )
        .expect("Failed to query for raid name.");
    let mut rows = stmt.query([]).unwrap();
    if let Ok(Some(row)) = rows.next() {
        return row.get::<_, usize>(0).unwrap() == 1;
    }

    return false;
}

fn if_boss_exist(boss_name: &str) -> bool {
    let Some(conn) = connect_to_db() else {
        return false;
    };

    let mut stmt = conn
        .prepare(
            format!(
                "SELECT EXISTS ( SELECT 1 FROM boss_list WHERE name = {:?});",
                boss_name
            )
            .as_str(),
        )
        .expect("Failed to query for boss name.");
    let mut rows = stmt.query([]).unwrap();
    if let Ok(Some(row)) = rows.next() {
        return row.get::<_, usize>(0).unwrap() == 1;
    }

    return false;
}

fn validate_boss_file_name<'a>(
    path: &'a PathBuf,
    postfix: &'a str,
) -> Option<(&'a str, Difficulty)> {
    if !path.is_file() {
        error!(
            "Expected boss fight timeline file, directory encountered instead: {:?}.",
            path.display()
        );
        return None;
    }
    let Some(file_name) = path.file_name().and_then(|file_name| file_name.to_str()) else {
        error!(
            "Incorrect boss fight timeline file name: {:?}.",
            path.file_name()
        );
        return None;
    };
    let Some((boss_name, postfix_)) = file_name.split_once('_') else {
        error!(
            "Incorrect boss fight timeline file: {:?}.",
            path.file_name()
        );
        return None;
    };
    let Some((difficulty, postfix_)) = postfix_.split_once('.') else {
        error!(
            "Incorrect boss fight timeline file: {:?}.",
            path.file_name()
        );
        return None;
    };
    if !(if_boss_exist(boss_name)
        && matches!(
            difficulty,
            "Normal" | "normal" | "Heroic" | "heroic" | "Mythic" | "mythic"
        )
        && postfix_ == postfix)
    {
        error!(
            "Incorrect boss fight timeline file name: {:?}.",
            path.file_name()
        );
        return None;
    }

    let difficulty = Difficulty::from(difficulty);
    return Some((boss_name, difficulty));
}

fn get_boss_spell_id(boss_name: &str, boss_spell_name: &str) -> Option<usize> {
    connect_to_db().and_then(|conn| {
        let mut stmt = conn
            .prepare(
                format!(
                    "SELECT spell_id
                From boss_spell
                WHERE name = {boss_spell_name:?} AND boss_name = {boss_name:?}"
                )
                .as_str(),
            )
            .unwrap();

        let mut rows = stmt.query([]).unwrap();
        if let Ok(Some(row)) = rows.next() {
            return row.get::<_, usize>(0).ok();
        }
        None
    })
}

// return (spell_name, cast_duration)
pub fn parse_boss_ability_string<'a>(
    ability_string: &'a str,
    spell_type: &'a str,
) -> Option<(&'a str, f32)> {
    // record only the begin timestamp of casted spells, and instant cast spell.
    if ability_string.contains("Canceled") | ability_string.contains("Anti-Magic Zone") {
        // skip canceled spells
        return None;
    } else if ability_string.contains("sec") && spell_type == "Cast" {
        // skip the second time mark of casted spell because the entry is already recorded when parsing the first time mark.
        return None;
    } else if ability_string.contains("sec") {
        // eg. "01:01.963","Begin Cast","Digestive Acid 2.09 sec"
        let splitted: Vec<&str> = ability_string.rsplitn(3, ' ').collect();
        let spell_name = splitted[2];
        let cast_duration: f32 = splitted[1].parse().unwrap_or_default();
        Some((spell_name, cast_duration))
    } else {
        // eg. "01:50.031","Cast","Bioactive Spines"
        Some((ability_string, 0.0))
    }
}
