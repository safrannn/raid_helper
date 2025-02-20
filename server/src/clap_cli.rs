use std::collections::HashMap;

use clap::Parser;
use import::utils::*;
use log::error;
use rusqlite::Connection;
use types::class::*;

#[derive(Parser)] // requires `derive` feature
#[command(name = "server")]
#[command(bin_name = "server")]
pub enum CargoCli {
    // --list-boss-names: [{name: <raid_name>, boss: [<boss_names>]}]
    ListRIAD,
}

// Return json string: [{name: <raid_name>, boss: [<boss_names>]}]
pub fn list_raid_boss() -> Vec<Raid> {
    // Connect to SQLite database
    let Ok(db_connection) = Connection::open(DATABASE) else {
        error!("Unable to connect to database.");
        return Vec::new();
    };

    // Query and print all bosses by raid.
    let mut stmt = db_connection
        .prepare(
            "SELECT raid_name, boss_name, icon FROM boss_list ORDER BY patch_major ASC, patch_minor ASC, order_id ASC;",
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

    let mut result: Vec<Raid> = Vec::new();
    let mut raid_visited: HashMap<String, usize> = HashMap::new();
    for raid in db_result_iter {
        let Ok(_) = raid.map(|(raid_name, boss_name, boss_icon)| {
            let new_boss = Boss::new(boss_name, boss_icon);
            match raid_visited.get(&raid_name) {
                Some(raid_index) => {
                    if let Some(elem) = result.get_mut(*raid_index) {
                        elem.add_boss(new_boss);
                    }
                }
                _ => {
                    result.push(Raid::new(raid_name.clone()));
                    raid_visited.insert(raid_name, result.len() - 1);
                }
            }
        }) else {
            error!("Error when writing db query result to string.");
            return Vec::new();
        };
    }
    result
}
