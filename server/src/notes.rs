use rusqlite::Connection;

pub fn get_fight_note(conn: &mut Connection, boss_name: String, difficulty: String) -> String {
    conn.query_row(
        format!(
            "SELECT note
            FROM fight_notes
            WHERE boss_name={boss_name:?} AND difficulty={difficulty:?};",
        )
        .as_str(),
        [],
        |row| row.get(0),
    )
    .unwrap_or_else(|_e| String::new())
}

pub fn update_fight_note(
    conn: &mut Connection,
    boss_name: String,
    difficulty: String,
    note: String,
) {
    conn.execute(
        format!(
            "INSERT OR REPLACE INTO fight_notes(boss_name, difficulty, note) 
            VALUES({boss_name:?}, {difficulty:?}, {note:?});",
        )
        .as_str(),
        (),
    )
    .unwrap();
}
