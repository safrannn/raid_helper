use std::collections::HashMap;
use std::{
    fs::File,
    io::{BufWriter, Write},
};
use types::spell::SpellCast;
use types::time::Time;

// ==================Data Import&Output Paths====================
pub const SOURCE_DATA: &'static str = "/Users/chengsu/projects/raid_helper/database/source_data";
pub const DATA: &'static str = "/Users/chengsu/projects/raid_helper/database/data";
pub const DATABASE: &'static str = "/Users/chengsu/projects/raid_helper/database/raid_helper.db";

// <SpellName, [SpellCast]>
pub type SpellCastEntries = HashMap<String, Vec<SpellCast>>;

pub fn parse_ability(ability: &str, time: Time) -> (&str, SpellCast) {
    if ability.contains("sec") {
        // eg. "01:01.963","Begin Cast","Digestive Acid 2.09 sec"
        let splitted: Vec<&str> = ability.rsplitn(3, ' ').collect();
        let spell_name = splitted[2];
        let cast_time: f32 = splitted[1].parse().unwrap_or_default();
        (spell_name, SpellCast::new(time, cast_time))
    } else {
        // eg. "01:50.031","Cast","Bioactive Spines"
        (ability, SpellCast::new(time, 0.0))
    }
}

// write data to json file // todo!: update this into database later

pub fn write_to_json<TData>(output_path: String, data: &TData)
where
    TData: serde::ser::Serialize,
{
    let file = File::create(output_path).unwrap();
    let mut writer = BufWriter::new(file);
    let _ = serde_json::to_writer(&mut writer, data);
    let _ = writer.flush();
}
