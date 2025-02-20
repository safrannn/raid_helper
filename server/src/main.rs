use clap::Parser;
use server::clap_cli::*;

fn main() {
    env_logger::init();
    // import::boss::import_boss_timeline();
    // import::boss::import_boss_spells();

    // ===============Test===============
    match CargoCli::parse() {
        CargoCli::ListBossByRaid => {
            println!("{:#?}", list_raid_boss());
        }
    };
}
