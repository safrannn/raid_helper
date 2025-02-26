use log::error;
use types::class::*;
use utils::*;

pub fn list_raid() -> Vec<Raid> {
    // Connect to SQLite database
    let Some(db_connection) = connect_to_db() else {
        return Vec::new();
    };
    // Query and list all bosses by raid.
    let mut stmt = db_connection
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
    raids
}

pub fn list_boss_by_raid() -> Vec<(String, Vec<Boss>)> {
    // Connect to SQLite database
    let Some(db_connection) = connect_to_db() else {
        return Vec::new();
    };
    let mut stmt = db_connection
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

pub fn list_boss_of_raid(raid_name: String) -> Vec<Boss> {
    // Connect to SQLite database
    let Some(db_connection) = connect_to_db() else {
        return Vec::new();
    };
    let mut stmt = db_connection
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
