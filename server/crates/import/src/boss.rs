use log::*;
use rusqlite::{params, Connection, Result};
use std::{
    collections::{HashMap, HashSet},
    fs::*,
    io::Read,
    path::{Path, PathBuf},
};

use crate::utils::*;
use types::{class::*, spell::*, time::*};

// ==================Import Bosss Timeline====================
// import database/source_data/boss_timeline.csv into sqlite
pub fn import_boss_timeline() {
    // Import csv file downloaded from warcraftlogs.com
    let boss_list_by_raid = get_boss_list_by_raid();
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
                if if_raid_exist(&boss_list_by_raid, raid_name_found) {
                    for entry in read_dir(raid_dir.clone())
                        .expect("Error while reading boss timeline directory.")
                    {
                        match entry {
                            Ok(dir) => {
                                // Validate file name. Expected: <BossName>_<RaidDifficulty>.csv
                                let path = dir.path();
                                let Some((boss_name, difficulty)) =
                                    validate_boss_file_name(&path, &boss_list_by_raid, "csv")
                                else {
                                    continue;
                                };
                                // Boss spell source data format: [Time, Type, Ability, Source -> Target...]
                                let Ok(mut reader) = csv::Reader::from_path(path.clone()) else {
                                    error!("Error reading boss fight timeline file as .csv file.");
                                    continue;
                                };
                                // Parse data into <SpellName, [SpellCasts]>
                                let mut casted_spells: SpellCastEntries = HashMap::new();
                                for record in reader.records() {
                                    if let Ok(record) = record {
                                        let time = record
                                            .get(0)
                                            .map(Time::from)
                                            .unwrap_or_else(|| Time::new(0, 0.0));
                                        let spell_type = record.get(1).unwrap_or_default();
                                        let spell = record.get(2).unwrap_or_default();
                                        // parse spell
                                        if spell.contains("Canceled")
                                            | spell.contains("Anti-Magic Zone")
                                        {
                                            // skip canceled spells
                                            continue;
                                        } else if spell.contains("sec") && spell_type == "Cast" {
                                            // skip the second time mark of casted spell because the entry is already recorded when parsing the first time mark.
                                            continue;
                                        }
                                        // record only the begin timestamp of casted spells, and instant cast spell.
                                        let (spell_name, spell_casted) = parse_ability(spell, time);
                                        casted_spells
                                            .entry(spell_name.to_string())
                                            .or_insert(Vec::new())
                                            .push(spell_casted);
                                    }
                                }

                                // Connect to SQLite database
                                let Ok(db_connection) = Connection::open(Path::new(DATABASE))
                                else {
                                    error!("Unable to find database");
                                    continue;
                                };
                                // Create a table if not exist
                                if let Err(err) = db_connection.execute(
                                    "CREATE TABLE boss_timeline (
                                            boss_name      TEXT,
                                            spell_id       TEXT,
                                            cast_start_min INTEGER,
                                            cast_start_sec NUMERIC,
                                            cast_time      TEXT
                                    );",
                                    [],
                                ) {
                                    error!("Unable to find create databse table: boss_timeline. Error: {err:?}.");
                                    continue;
                                };
                                for (spell_name, spell_casts) in casted_spells.iter() {
                                    for spell_cast in spell_casts {
                                        // find spell id fist
                                        if let Err(err) = db_connection.execute(
                                        "INSERT INTO boss_timeline (boss_name, name, icon, type, boss_name) VALUES (?1, ?2, ?3, ?4, ?5)",
                                        params![&boss_spell.id, &boss_spell.name, &boss_spell.icon, boss_spell.spell_type, &boss_name],
                                        ){
                                            error!("boss_spell database table insert error: {err:?}. spell_id: {:?} | spell_name: {:?}", boss_spell.id, boss_spell.name);
                                        };
                                    }
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

// ==================Import Bosss Spell====================
// import boss spells info from json files into database.
pub fn import_boss_spells() {
    let boss_list_by_raid = get_boss_list_by_raid();
    let boss_spell_path_by_raid = format!("{}/boss_spell", SOURCE_DATA.to_string(),);

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
                if if_raid_exist(&boss_list_by_raid, raid_name) {
                    for entry in read_dir(raid_dir.clone())
                        .expect("Error while reading boss spell directory.")
                    {
                        match entry {
                            Ok(dir) => {
                                // Validate file name. Expected: <BossName>_<RaidDifficulty>.csv
                                let path = dir.path();

                                let Some((boss_name, _difficulty)) =
                                    validate_boss_file_name(&path, &boss_list_by_raid, "json")
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

                                // Connect to SQLite database
                                let Ok(db_connection) = Connection::open(Path::new(DATABASE))
                                else {
                                    error!("Unable to find database");
                                    continue;
                                };
                                // Create a table if not exist
                                if let Err(err) = db_connection.execute(
                                    "CREATE TABLE IF NOT EXISTS boss_spell (
                                    id        TEXT PRIMARY KEY
                                                UNIQUE,
                                    name      TEXT,
                                    icon      TEXT DEFAULT [www.wowhead.com/icon=],
                                    type      TEXT DEFAULT [Default],
                                    boss_name TEXT
                                );",
                                    [],
                                ) {
                                    error!("Unable to find create databse table: boss_spell. Error: {err:?}.");
                                    continue;
                                };
                                for boss_spell in boss_spells {
                                    // TODO: save into sql database
                                    if let Err(err) = db_connection.execute(
                                        "INSERT INTO boss_spell (id, name, icon, type, boss_name) VALUES (?1, ?2, ?3, ?4, ?5)",
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
pub fn get_boss_list_by_raid() -> HashSet<Raid> {
    // Connect to SQLite database
    let Ok(db_connection) = Connection::open(DATABASE) else {
        error!("Unable to connect to database.");
        return HashSet::new();
    };

    // Query and print all bosses by raid.
    let mut stmt = db_connection
        .prepare("SELECT name, raid_name, order_id FROM boss_list;")
        .unwrap();
    let db_result_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, usize>(2)?,
            ))
        })
        .unwrap();

    let mut boss_names_by_raid: HashMap<String, HashSet<String>> = HashMap::new();
    for raid in db_result_iter {
        if let Err(err) = raid.map(|(boss_name, raid_name, raid_order)| {
            boss_names_by_raid
                .entry(raid_name)
                .or_insert(HashSet::new())
                .insert(boss_name);
        }) {
            error!("Error when writing db query result to string: {err:?}.");
            return HashMap::new();
        };
    }
    return boss_names_by_raid;
}

pub fn if_raid_exist(boss_list: &HashMap<String, HashSet<String>>, raid_name: &str) -> bool {
    for raid in boss_list.keys() {
        if raid.as_str() == raid_name {
            return true;
        }
    }
    return false;
}

pub fn if_boss_exist(boss_list: &HashMap<String, HashSet<String>>, boss_name: String) -> bool {
    for raid in boss_list.values() {
        if raid.contains(&boss_name) {
            return true;
        }
    }
    return false;
}

fn validate_boss_file_name<'a>(
    path: &'a PathBuf,
    boss_list_by_raid: &HashMap<String, HashSet<String>>,
    postfix: &'a str,
) -> Option<(&'a str, &'a str)> {
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
    if !(if_boss_exist(boss_list_by_raid, boss_name.to_string())
        && matches!(difficulty, "Normal" | "Heroic" | "Mythic")
        && postfix_ == postfix)
    {
        error!(
            "Incorrect boss fight timeline file name: {:?}.",
            path.file_name()
        );
        return None;
    }

    return Some((boss_name, difficulty));
}
