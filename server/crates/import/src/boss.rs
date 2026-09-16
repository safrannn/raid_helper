use log::*;
use rusqlite::{params, Connection, Result};
use std::{
    collections::{HashMap, HashSet},
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

                                        let Some((spell_name, duration)) =
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
                                            duration,
                                            position: None,
                                        };
                                        timeline_entries.push(timeline_entry);
                                    }
                                }

                                for timeline_entry in timeline_entries.iter() {
                                    // Store  store timeline_entry into timeline_entry table.
                                    let mut stmt = conn
                                    .prepare(format!("INSERT OR IGNORE into timeline_entry (boss_name, difficulty, start_time_in_sec, id, duration)
                                        VALUES ({:?}, {:?}, {:?}, {:?}, {:?});",
                                        boss_name,
                                        format!("{:?}", timeline_entry.difficulty),
                                        timeline_entry.start_cast.get_sec(),
                                        timeline_entry.spell_id,
                                        timeline_entry.duration,
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
                                        "INSERT OR IGNORE INTO boss_spell (id, name, icon, type, boss_name) VALUES (?1, ?2, ?3, ?4, ?5);",
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
                    "SELECT id
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

// return (spell_name, duration)
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
        let duration: f32 = splitted[1].parse().unwrap_or_default();
        Some((spell_name, duration))
    } else {
        // eg. "01:50.031","Cast","Bioactive Spines"
        Some((ability_string, 0.0))
    }
}

#[derive(Debug, serde::Deserialize)]
struct BossSpellRecord {
    name: String,
    id: Option<usize>,
    icon: Option<String>,
    #[serde(default = "default_spell_type")]
    spell_type: String,
    #[serde(default = "default_visibility")]
    visibility: bool,
}

fn default_spell_type() -> String {
    "Default".to_string()
}

fn default_visibility() -> bool {
    true
}

fn boss_exists(conn: &Connection, boss_name: &str) -> bool {
    conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM boss_list WHERE name = ?1);",
        [boss_name],
        |row| row.get::<_, bool>(0),
    )
    .unwrap_or(false)
}

fn boss_name_from_path(conn: &Connection, path: &Path) -> Option<String> {
    let stem = path.file_stem().and_then(|s| s.to_str())?;
    if boss_exists(conn, stem) {
        return Some(stem.to_string());
    }
    let (boss_name, _) = stem.rsplit_once('_')?;
    boss_exists(conn, boss_name).then(|| boss_name.to_string())
}

pub fn import_boss_spell_file(conn: &mut Connection, path: &Path) {
    if path.is_dir() {
        for entry in read_dir(path).expect("Error while reading boss spell directory.") {
            if let Ok(entry) = entry {
                if entry.path().extension().and_then(|e| e.to_str()) == Some("json") {
                    import_boss_spell_file(conn, &entry.path());
                }
            }
        }
        return;
    }

    let Some(boss_name) = boss_name_from_path(conn, path) else {
        error!("Unknown boss for boss spell file: {}", path.display());
        return;
    };
    let json = match read_to_string(path) {
        Ok(json) => json,
        Err(err) => {
            error!("Error reading boss spell file {}: {err:?}", path.display());
            return;
        }
    };
    let boss_spells: Vec<BossSpellRecord> = match serde_json::from_str(&json) {
        Ok(boss_spells) => boss_spells,
        Err(err) => {
            error!("Error parsing boss spell file {}: {err:?}", path.display());
            return;
        }
    };

    let (mut inserted, mut skipped) = (0, 0);
    for spell in boss_spells {
        let Some(id) = spell.id else {
            warn!("{boss_name}: skipping {:?}, no spell id.", spell.name);
            skipped += 1;
            continue;
        };
        let exists = conn
            .query_row(
                "SELECT EXISTS (SELECT 1 FROM boss_spell WHERE id = ?1 AND boss_name = ?2);",
                params![id, boss_name],
                |row| row.get::<_, bool>(0),
            )
            .unwrap_or(false);
        if exists {
            skipped += 1;
            continue;
        }
        let icon = spell
            .icon
            .unwrap_or_else(|| "www.wowhead.com/icon=".to_string());
        match conn.execute(
            "INSERT INTO boss_spell (id, boss_name, name, icon, type, visibility) VALUES (?1, ?2, ?3, ?4, ?5, ?6);",
            params![id, boss_name, spell.name, icon, spell.spell_type, spell.visibility],
        ) {
            Ok(_) => inserted += 1,
            Err(err) => error!(
                "boss_spell insert error: {err:?}. spell_id: {id} | spell_name: {:?}",
                spell.name
            ),
        }
    }
    info!(
        "{boss_name}: imported {inserted} boss spells, skipped {skipped} ({}).",
        path.display()
    );
}

struct CastRow {
    time: Time,
    is_begin: bool,
    canceled: bool,
    spell_name: String,
    source: String,
    cast_time: Option<f32>,
}

fn parse_cast_row(record: &csv::StringRecord) -> Option<CastRow> {
    let time = Time::from(record.get(0)?);
    let row_type = record.get(1)?;
    let ability = record.get(2)?.trim();
    let source_target = record.get(3).unwrap_or_default();
    let is_begin = row_type == "Begin Cast";
    if !is_begin && row_type != "Cast" {
        return None;
    }

    let strip_instance = |s: &str| -> String {
        match s.trim().rsplit_once(' ') {
            Some((name, n)) if n.chars().all(|c| c.is_ascii_digit()) => name.to_string(),
            _ => s.trim().to_string(),
        }
    };

    if let Some((source, rest)) = ability.split_once(" begins casting ") {
        return Some(CastRow {
            time,
            is_begin: true,
            canceled: false,
            spell_name: rest.trim().to_string(),
            source: strip_instance(source),
            cast_time: None,
        });
    }
    if let Some((source, rest)) = ability.split_once(" casts ") {
        let spell_name = rest.split(" on ").next().unwrap_or(rest).trim().to_string();
        return Some(CastRow {
            time,
            is_begin: false,
            canceled: false,
            spell_name,
            source: strip_instance(source),
            cast_time: None,
        });
    }

    let source = strip_instance(source_target.split('→').next().unwrap_or_default());
    if let Some(spell_name) = ability.strip_suffix(" Canceled") {
        return Some(CastRow {
            time,
            is_begin,
            canceled: true,
            spell_name: spell_name.trim().to_string(),
            source,
            cast_time: None,
        });
    }
    if let Some(rest) = ability.strip_suffix(" sec") {
        if let Some((spell_name, cast_time)) = rest.rsplit_once(' ') {
            if let Ok(cast_time) = cast_time.parse::<f32>() {
                return Some(CastRow {
                    time,
                    is_begin,
                    canceled: false,
                    spell_name: spell_name.to_string(),
                    source,
                    cast_time: Some(cast_time),
                });
            }
        }
    }
    Some(CastRow {
        time,
        is_begin,
        canceled: false,
        spell_name: ability.to_string(),
        source,
        cast_time: None,
    })
}

pub fn import_boss_spell_cast_file(conn: &mut Connection, path: &Path) {
    if path.is_dir() {
        for entry in read_dir(path).expect("Error while reading boss timeline directory.") {
            if let Ok(entry) = entry {
                if entry.path().extension().and_then(|e| e.to_str()) == Some("csv") {
                    import_boss_spell_cast_file(conn, &entry.path());
                }
            }
        }
        return;
    }

    let Some(boss_name) = boss_name_from_path(conn, path) else {
        error!("Unknown boss for boss timeline file: {}", path.display());
        return;
    };
    let difficulty = path
        .file_stem()
        .and_then(|s| s.to_str())
        .and_then(|stem| stem.rsplit_once('_'))
        .map(|(_, difficulty)| Difficulty::from(difficulty))
        .unwrap_or(Difficulty::Other);
    if matches!(difficulty, Difficulty::Other) {
        error!(
            "Expected <Boss>_<Difficulty>.csv boss timeline file name: {}",
            path.display()
        );
        return;
    }
    let difficulty = format!("{difficulty:?}");

    let mut reader = match csv::Reader::from_path(path) {
        Ok(reader) => reader,
        Err(err) => {
            error!(
                "Error reading boss timeline file {}: {err:?}",
                path.display()
            );
            return;
        }
    };

    let mut spell_ids: HashMap<String, usize> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT name, id FROM boss_spell WHERE boss_name = ?1;")
            .unwrap();
        let rows = stmt
            .query_map([&boss_name], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, usize>(1)?))
            })
            .unwrap();
        for row in rows.flatten() {
            spell_ids.insert(row.0, row.1);
        }
    }

    let dedupe_key = |spell_id: usize, start: f32| (spell_id, (start * 2.0).round() as i64);
    let mut seen: HashSet<(usize, i64)> = HashSet::new();
    {
        let mut stmt = conn
            .prepare("SELECT spell_id, start_time_in_sec FROM boss_timeline_entry WHERE boss_name = ?1 AND difficulty = ?2;")
            .unwrap();
        let rows = stmt
            .query_map(params![boss_name, difficulty], |row| {
                Ok((row.get::<_, usize>(0)?, row.get::<_, f32>(1)?))
            })
            .unwrap();
        for (spell_id, start) in rows.flatten() {
            seen.insert(dedupe_key(spell_id, start));
        }
    }

    let mut pending: HashMap<(String, String), f32> = HashMap::new();
    let mut entries: Vec<(usize, f32, f32)> = Vec::new();
    let mut unknown_spells: HashSet<String> = HashSet::new();
    for record in reader.records().flatten() {
        let Some(row) = parse_cast_row(&record) else {
            continue;
        };
        if row.source == "Environment" || row.spell_name == "Anti-Magic Zone" {
            continue;
        }
        let key = (row.spell_name.clone(), row.source.clone());
        if row.canceled {
            pending.remove(&key);
            continue;
        }
        let time = row.time.get_sec();
        let (start, duration) = if row.is_begin {
            match row.cast_time {
                // "Begin Cast","Spell 1.52 sec": complete on its own.
                Some(cast_time) => {
                    pending.insert(key, time);
                    (time, cast_time)
                }
                // "X begins casting Spell": duration is known once the Cast row arrives.
                None => {
                    pending.insert(key, time);
                    continue;
                }
            }
        } else {
            match (pending.remove(&key), row.cast_time) {
                // Cast row that ends a cast recorded from its Begin Cast row.
                (Some(begin), Some(cast_time)) if time - begin <= cast_time + 0.5 => continue,
                // Cast row without a Begin Cast row: the timestamp marks the end of the cast.
                (_, Some(cast_time)) => (time - cast_time, cast_time),
                // "X casts Spell" completing "X begins casting Spell".
                (Some(begin), None) if time - begin <= 30.0 => (begin, time - begin),
                // Instant cast.
                _ => (time, 0.0),
            }
        };

        let Some(&spell_id) = spell_ids.get(&row.spell_name) else {
            unknown_spells.insert(row.spell_name);
            continue;
        };
        if seen.insert(dedupe_key(spell_id, start)) {
            entries.push((spell_id, start.max(0.0), duration));
        }
    }
    // Begin Cast rows in the "begins casting" format that never completed (interrupted).
    for ((spell_name, _), begin) in pending {
        let Some(&spell_id) = spell_ids.get(&spell_name) else {
            unknown_spells.insert(spell_name);
            continue;
        };
        if seen.insert(dedupe_key(spell_id, begin)) {
            entries.push((spell_id, begin, 0.0));
        }
    }

    let mut inserted = 0;
    for (spell_id, start, duration) in &entries {
        match conn.execute(
            "INSERT INTO boss_timeline_entry (boss_name, difficulty, spell_id, start_time_in_sec, duration) VALUES (?1, ?2, ?3, ?4, ?5);",
            params![boss_name, difficulty, spell_id, start, duration],
        ) {
            Ok(_) => inserted += 1,
            Err(err) => error!("boss_timeline_entry insert error: {err:?}. spell_id: {spell_id}"),
        }
    }
    for spell_name in &unknown_spells {
        warn!("{boss_name} {difficulty}: no boss_spell entry for {spell_name:?}, casts skipped.");
    }
    info!(
        "{boss_name} {difficulty}: imported {inserted} spell casts ({}).",
        path.display()
    );
}
