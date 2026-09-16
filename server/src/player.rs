use std::collections::{HashMap, HashSet};

use log::error;
use rusqlite::Connection;
use types::spell::{PlayerSpell, PlayerSpellsByClassSpec, PlayerSpellsBySpec};
use utils::connect_to_db;

// using class spec icon as player icon.
pub fn add_player(
    conn: &mut Connection,
    player_name: String,
    player_class_name: String,
    player_spec_name: String,
    boss_name: String,
    difficulty: String,
) -> i32 {
    let mut stmt = conn
        .prepare(
        format!("SELECT name, class_name, spec_name
                FROM player_list
                WHERE name={player_name:?} AND class_name={player_class_name:?} AND spec_name={player_spec_name:?} AND boss_name = {boss_name:?} AND difficulty={difficulty:?};
                ",
                ).as_str(),
        )
        .unwrap();
    let mut rows = stmt.query([]).unwrap();
    if let Ok(Some(_)) = rows.next() {
        return -2;
    }

    conn
        .execute(
        format!("INSERT INTO player_list (name, class_name, spec_name, boss_name, difficulty)
                VALUES ({player_name:?}, {player_class_name:?}, {player_spec_name:?}, {boss_name:?}, {difficulty:?});",
                ).as_str(),
        ())
        .unwrap();
    let mut stmt = conn
        .prepare(
        format!("SELECT id
                FROM player_list
                WHERE name={player_name:?} AND class_name={player_class_name:?} AND spec_name={player_spec_name:?} AND boss_name = {boss_name:?} AND difficulty={difficulty:?};
                ",
                ).as_str(),
        )
        .unwrap();
    let mut rows = stmt.query([]).unwrap();
    if let Some(row) = rows.next().unwrap() {
        return row.get::<_, i32>(0).unwrap();
    } else {
        return -1;
    }
}

pub fn update_player(
    conn: &mut Connection,
    player_id: usize,
    player_name: String,
    player_class_name: String,
    player_spec_name: String,
) -> i32 {
    let fight: Result<(String, String), _> = conn.query_row(
        "SELECT boss_name, difficulty FROM player_list WHERE id = ?1;",
        [player_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );
    let Ok((boss_name, difficulty)) = fight else {
        error!("Player not found in db: {player_id}.");
        return -1;
    };

    let duplicate: Result<usize, _> = conn.query_row(
        "SELECT id FROM player_list
        WHERE name = ?1 AND class_name = ?2 AND spec_name = ?3
            AND boss_name = ?4 AND difficulty = ?5 AND id != ?6;",
        (
            &player_name,
            &player_class_name,
            &player_spec_name,
            &boss_name,
            &difficulty,
            player_id,
        ),
        |row| row.get(0),
    );
    if duplicate.is_ok() {
        return -2;
    }

    match conn.execute(
        "UPDATE player_list SET name = ?1, class_name = ?2, spec_name = ?3 WHERE id = ?4;",
        (
            &player_name,
            &player_class_name,
            &player_spec_name,
            player_id,
        ),
    ) {
        Ok(_) => player_id as i32,
        Err(err) => {
            error!("Error when updating player in db: {err:?}.");
            -1
        }
    }
}

// <(class_name, spec_name), icon>
pub fn get_player_class_spec_icon(conn: &mut Connection) -> Vec<(String, String, String)> {
    let mut stmt = conn
        .prepare(
            "SELECT class_name, spec_name, icon
            FROM player_class_spec
            ORDER BY class_name ASC, spec_name ASC;",
        )
        .unwrap();
    let db_result_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .unwrap();
    let mut result = vec![];
    for db_result in db_result_iter {
        let Ok((class_name, spec_name, icon)) = db_result else {
            error!("Error when fetching class and spec data from db: {db_result:?}.");
            continue;
        };
        result.push((class_name, spec_name, icon));
    }
    result
}

pub fn get_player_spell(spell_id: usize) -> Option<PlayerSpell> {
    let Some(db_connection) = connect_to_db() else {
        return None;
    };
    let mut stmt = db_connection
        .prepare(
            format!(
                "SELECT name, class_name, spec_name, cool_down, duration, type, icon
                FROM player_spell 
                WHERE id={spell_id:?};",
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
                row.get::<_, usize>(3)?,
                row.get::<_, usize>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        })
        .unwrap();

    db_result.next().and_then(
        |spell_info: Result<
            (String, String, String, usize, usize, String, String),
            rusqlite::Error,
        >| {
            spell_info
                .map(
                    |(name, class_name, spec_name, cool_down, duration, spell_type, icon)| {
                        return PlayerSpell {
                            id: spell_id,
                            name,
                            class_name,
                            spec_name,
                            cool_down,
                            duration,
                            spell_type,
                            icon,
                        };
                    },
                )
                .ok()
        },
    )
}

pub fn get_player_spells(conn: &mut Connection) -> HashSet<PlayerSpell> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, class_name, spec_name, cool_down, duration, type, icon
            FROM player_spell",
        )
        .unwrap();
    let db_result_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, usize>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, usize>(4)?,
                row.get::<_, usize>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
            ))
        })
        .unwrap();
    let mut result = HashSet::new();
    for db_result in db_result_iter {
        let Ok((id, name, class_name, spec_name, cool_down, duration, spell_type, icon)) =
            db_result
        else {
            error!("Error when fetching player spells from db: {db_result:?}.");
            continue;
        };
        result.insert(PlayerSpell {
            id,
            name,
            class_name,
            spec_name,
            cool_down,
            duration,
            spell_type,
            icon,
        });
    }
    result
}

pub fn get_player_spells_by_spell_type(conn: &mut Connection) -> Vec<(String, Vec<PlayerSpell>)> {
    let player_spells = get_player_spells(conn);
    let mut spells_map = HashMap::new();

    for player_spell in player_spells {
        let entry = spells_map
            .entry(player_spell.spell_type.clone())
            .or_insert(vec![]);
        entry.push(player_spell);
    }

    let mut sorted_vec: Vec<(String, Vec<PlayerSpell>)> = spells_map.into_iter().collect();
    sorted_vec.sort_by_key(|(key, _)| key.clone());

    sorted_vec.iter_mut().for_each(|(_spell_type, spells)| {
        spells.sort_by(|a, b| {
            a.class_name
                .cmp(&b.class_name)
                .then(a.spec_name.cmp(&b.spec_name))
        });
    });

    return sorted_vec;
}

pub fn get_player_spells_by_class_spec(conn: &mut Connection) -> Vec<PlayerSpellsByClassSpec> {
    let player_spells = get_player_spells(conn);
    let mut player_spells_by_class_spec: HashMap<String, HashMap<String, Vec<PlayerSpell>>> =
        HashMap::new();

    for player_spell in player_spells {
        let class_entry = player_spells_by_class_spec
            .entry(player_spell.class_name.clone())
            .or_insert(HashMap::new());
        // spec_map.insert(player_spell.class_spec.1.clone(), player_spell)
        let spec_entry = class_entry
            .entry(player_spell.spec_name.clone())
            .or_insert(vec![]);
        spec_entry.push(player_spell);
    }

    let player_spells_by_class_spec_ = player_spells_by_class_spec
        .iter_mut()
        .map(|(class_name, spells_by_spec)| {
            let mut spells_by_spec_ = spells_by_spec
                .into_iter()
                .map(|(spec_name, spells)| {
                    let mut spells_sorted = spells.clone();
                    spells_sorted.sort_by_key(|entry| entry.name.clone());
                    PlayerSpellsBySpec {
                        spec_name: spec_name.clone(),
                        spells: spells_sorted,
                    }
                })
                .collect::<Vec<PlayerSpellsBySpec>>();
            spells_by_spec_.sort_by_key(|entry| entry.spec_name.clone());
            (class_name, spells_by_spec_)
        })
        .collect::<Vec<_>>();

    let mut player_spells_by_class_spec_ = player_spells_by_class_spec_
        .into_iter()
        .map(|(class_name, spells_by_spec)| PlayerSpellsByClassSpec {
            class_name: class_name.clone(),
            spells_by_spec: spells_by_spec,
        })
        .collect::<Vec<PlayerSpellsByClassSpec>>();
    player_spells_by_class_spec_.sort_by_key(|entry| entry.class_name.clone());

    player_spells_by_class_spec_
}

pub fn get_player_class_names(conn: &mut Connection) -> Vec<String> {
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT class_name
            FROM player_class_spec
            ORDER BY class_name ASC;",
        )
        .unwrap();
    let db_result_iter = stmt
        .query_map([], |row| Ok(row.get::<_, String>(0)?))
        .unwrap();
    let mut result = vec![];
    for db_result in db_result_iter {
        let Ok(class_name) = db_result else {
            error!("Error when fetching class names from db: {db_result:?}.");
            continue;
        };
        result.push(class_name);
    }
    result
}

pub fn add_player_spell_cast(
    conn: &mut Connection,
    player_id: usize,
    spell_id: usize,
    start_time_in_sec: f32,
) -> i64 {
    match conn.execute(
        "INSERT INTO player_timeline_entry (player_id, spell_id, start_time_in_sec)
        VALUES (?1, ?2, ?3);",
        (player_id, spell_id, start_time_in_sec),
    ) {
        Ok(_) => conn.last_insert_rowid(),
        Err(err) => {
            error!("Error when adding player spell cast to db: {err:?}.");
            -1
        }
    }
}

pub fn remove_player_spell_cast(conn: &mut Connection, keyframe_group_id: usize) -> bool {
    match conn.execute(
        "DELETE FROM player_timeline_entry WHERE keyframe_group_id = ?1;",
        [keyframe_group_id],
    ) {
        Ok(deleted) => deleted > 0,
        Err(err) => {
            error!("Error when removing player spell cast from db: {err:?}.");
            false
        }
    }
}

pub fn update_player_spell_cast(
    conn: &mut Connection,
    keyframe_group_id: usize,
    start_time_in_sec: f32,
) -> bool {
    match conn.execute(
        "UPDATE player_timeline_entry SET start_time_in_sec = ?1 WHERE keyframe_group_id = ?2;",
        (start_time_in_sec, keyframe_group_id),
    ) {
        Ok(updated) => updated > 0,
        Err(err) => {
            error!("Error when updating player spell cast in db: {err:?}.");
            false
        }
    }
}
