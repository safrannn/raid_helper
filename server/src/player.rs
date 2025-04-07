use std::collections::{HashMap, HashSet};

use log::error;
use rusqlite::Connection;
use types::spell::{PlayerSpell, PlayerSpellsByClassSpec, PlayerSpellsBySpec};

// using class spec icon as player icon.
pub fn add_player(
    conn: &mut Connection,
    player_name: String,
    player_class_name: String,
    player_spec_name: String,
) -> i32 {
    let mut stmt = conn
        .prepare(
        format!("INSERT OR IGNORE into player_list (name, class_name, spec_name)
                VALUES ({player_name:?}, {player_class_name:?}, {player_spec_name:?});
                SELECT id
                FROM player_list
                WHERE name={player_name:?} AND class_name={player_class_name:?} AND spec_name={player_spec_name:?}
                ",
                ).as_str(),
        )
        .unwrap();
    let mut rows = stmt.query([]).unwrap();
    if let Ok(Some(row)) = rows.next() {
        return row.get::<_, i32>(0).unwrap();
    }
    return -1;
}

// <(class_name, spec_name), icon>
pub fn get_player_class_spec_icon(conn: &mut Connection) -> Vec<(String, String, String)> {
    let mut stmt = conn
        .prepare(
            "SELECT class_name, spec_name, icon
            FROM player_class_spec
            ORDER BY class_name ASC;",
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

pub fn get_player_spells(conn: &mut Connection) -> HashSet<PlayerSpell> {
    let mut stmt = conn
        .prepare(
            "SELECT spell_id, name, class_name, spec_name, cool_down, cast_duration, type, icon
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
        let Ok((spell_id, name, class_name, spec_name, cool_down, cast_duration, spell_type, icon)) =
            db_result
        else {
            error!("Error when fetching player spells from db: {db_result:?}.");
            continue;
        };
        result.insert(PlayerSpell {
            spell_id,
            name,
            class_name,
            spec_name,
            cool_down,
            cast_duration,
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
