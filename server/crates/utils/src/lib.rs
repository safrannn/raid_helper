use log::error;
use rusqlite::Connection;

// ==================Data Import&Output Paths====================
pub const SOURCE_DATA: &'static str = "/Users/chengsu/projects/raid_helper/database/source_data";
pub const DATABASE: &'static str = "/Users/chengsu/projects/raid_helper/database/raid_helper.db";

pub fn connect_to_db() -> Option<Connection> {
    match Connection::open(DATABASE) {
        Ok(db_connection) => Some(db_connection),
        _ => {
            error!("Unable to connect to database.");
            None
        }
    }
}
