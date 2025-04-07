use log::error;
use rusqlite::Connection;
use types::{class::*, spell::BossSpell};
use utils::connect_to_db;

pub fn list_raid(conn: &mut Connection) -> Vec<Raid> {
    let mut stmt = conn
        .prepare(
            "SELECT name, patch_major, patch_minor 
        FROM raid_list 
        ORDER BY patch_major ASC, patch_minor ASC;",
        )
        .unwrap();
    let db_result_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, usize>(1)?,
                row.get::<_, usize>(2)?,
            ))
        })
        .unwrap();

    let mut raids: Vec<Raid> = Vec::new();
    for raid in db_result_iter {
        let Ok(_) = raid.map(|(raid_name, patch_major, patch_minor)| {
            let patch = format!("{}.{}", patch_major, patch_minor);
            raids.push(Raid::new(raid_name, patch));
        }) else {
            error!("Error when writing db query result to string.");
            continue;
        };
    }
    println!("{:?}", raids);
    raids
}

pub fn list_boss_by_raid(conn: &mut Connection) -> Vec<(String, Vec<Boss>)> {
    let mut stmt = conn
        .prepare(
            "SELECT boss_list.raid_name, boss_list.name, boss_list.icon
            FROM boss_list
            JOIN raid_list ON boss_list.raid_name = raid_list.name
            ORDER BY raid_list.patch_major ASC, raid_list.patch_minor ASC, boss_list.raid_order ASC;",
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

    let mut result: Vec<(String, Vec<Boss>)> = Vec::new();
    for raid in db_result_iter {
        let Ok((raid_name, boss_name, boss_icon)) = raid else {
            error!("Error when writing db query result to string.");
            return Vec::new();
        };
        let boss = Boss::new(boss_name.clone(), boss_icon);
        if let Some((raid_name_, boss_info)) = result.last_mut() {
            if raid_name == *raid_name_ {
                boss_info.push(boss);
            } else {
                result.push((raid_name, vec![boss]));
            }
        } else if result.is_empty() {
            result.push((raid_name, vec![boss]));
        }
    }
    result
}

pub fn list_boss_of_raid(conn: &mut Connection, raid_name: String) -> Vec<Boss> {
    let mut stmt = conn
        .prepare(
            format!(
                "SELECT boss_list.name, boss_list.icon
            FROM boss_list
            WHERE boss_list.raid_name = {:?}
            ORDER BY boss_list.raid_order ASC;",
                raid_name
            )
            .as_str(),
        )
        .unwrap();
    let db_result_iter = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .unwrap();

    let mut result: Vec<Boss> = Vec::new();
    for boss in db_result_iter {
        let Ok((boss_name, boss_icon)) = boss else {
            error!("Error when writing db query result to string.");
            return Vec::new();
        };
        result.push(Boss::new(boss_name, boss_icon));
    }

    return result;
}

pub fn get_raid_name_of_boss(conn: &mut Connection, boss_name: String) -> String {
    conn.query_row(
        format!(
            "SELECT raid_name
                FROM boss_list 
                WHERE name={boss_name:?}"
        )
        .as_str(),
        [],
        |row| row.get(0),
    )
    .unwrap_or_else(|e| {
        error!("Error when getting boss's raid name from db. {e:?}");
        String::new()
    })
}

pub fn list_boss_spells(conn: &mut Connection, boss_name: String) -> Vec<BossSpell> {
    let mut stmt = conn
        .prepare(
            format!(
                "SELECT name, spell_id, icon, type, visibility
            FROM boss_spell
            WHERE boss_name = {boss_name:?};",
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
                row.get::<_, usize>(4)?,
            ))
        })
        .unwrap();

    let mut result: Vec<BossSpell> = Vec::new();
    for boss in db_result_iter {
        let Ok((name, id, icon, spell_type, visibility)) = boss else {
            error!("Error when writing db query result to string.");
            return Vec::new();
        };
        result.push(BossSpell {
            name,
            id,
            icon,
            spell_type,
            visibility: visibility == 1,
        });
    }

    return result;
}

pub fn update_boss_spell_visibility(
    conn: &mut Connection,
    spell_id: usize,
    boss_name: String,
    difficulty: String,
    visibility: bool,
) {
    let visibility_int = if visibility { 1 } else { 0 };
    conn.execute(
        format!(
            "UPDATE boss_timeline_entry
            SET visibility = {visibility_int:?}
            WHERE spell_id={spell_id:?} AND boss_name={boss_name:?} AND difficulty={difficulty:?};"
        )
        .as_str(),
        (),
    )
    .unwrap();
}

// return (spell_id, spell_name, icon_url, spell_type)
pub fn get_boss_spell_info(spell_id: usize, boss_name: &String) -> Option<BossSpell> {
    let Some(db_connection) = connect_to_db() else {
        return None;
    };
    // Query and list all bosses by raid.
    let mut stmt = db_connection
        .prepare(
            format!(
                "SELECT name, icon, type, visibility
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
                row.get::<_, usize>(3)?,
            ))
        })
        .unwrap();

    db_result.next().and_then(
        |spell_info: Result<(String, String, String, usize), rusqlite::Error>| {
            spell_info
                .map(|(name, icon, spell_type, visibility)| {
                    return BossSpell {
                        name,
                        id: spell_id,
                        icon,
                        spell_type: spell_type,
                        visibility: visibility == 1,
                    };
                })
                .ok()
        },
    )
}
