use crate::{
    boss::*,
    notes::{get_fight_note, update_fight_note},
    player::{
        get_player_class_spec_icon, get_player_spells, get_player_spells_by_class_spec,
        get_player_spells_by_spell_type,
    },
    timeline::get_timeline_boss_spells,
};
use clap::{Parser, Subcommand};
use log::info;
use rusqlite::Connection;

#[derive(Parser)]
#[command(name = "server")]
#[command(bin_name = "server")]
pub enum CargoCli {
    Command(Cli),
}

#[derive(clap::Args, Debug)]
#[command(author, version, about)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Subcommand, Debug, Clone)]
pub enum Command {
    ListRaid,

    ListBoss {
        #[arg(default_value = None)]
        of_raid: Option<String>,
    },

    ListBossSpells {
        boss_name: String,
    },

    GetTimelineBossSpells {
        boss_name: String,
        difficulty: String,
    },

    GetPlayerClassSpecIcon,

    GetPlayerSpells,

    GetPlayerSpellsBySpellType,

    GetPlayerSpellsByClassSpec,

    GetFightNote {
        boss_name: String,
        difficulty: String,
    },

    UpdateFightNote {
        boss_name: String,
        difficulty: String,
        new_note: String,
    },
}

pub fn test_cli() {
    info!("test_cli");
    let CargoCli::Command(cli) = CargoCli::parse();
    let command = cli.command;
    let mut conn = Connection::open("/Users/chengsu/Projects/raid_helper/database/raid_helper.db")
        .expect("Failed to open database");

    match command {
        Command::ListRaid => println!("{:#?}", list_raid(&mut conn)),
        Command::ListBoss { of_raid } => {
            if let Some(raid_name) = of_raid {
                println!("{:#?}", list_boss_of_raid(&mut conn, raid_name));
            } else {
                println!("{:#?}", list_boss_by_raid(&mut conn));
            }
        }
        Command::GetTimelineBossSpells {
            boss_name,
            difficulty,
        } => {
            println!(
                "{:#?}",
                get_timeline_boss_spells(&mut conn, boss_name, difficulty)
            );
        }
        Command::ListBossSpells { boss_name } => {
            println!("{:#?}", list_boss_spells(&mut conn, boss_name));
        }

        Command::GetPlayerClassSpecIcon => {
            println!("{:#?}", get_player_class_spec_icon(&mut conn));
        }
        Command::GetPlayerSpells => {
            println!("{:#?}", get_player_spells(&mut conn));
        }
        Command::GetPlayerSpellsBySpellType => {
            println!("{:#?}", get_player_spells_by_spell_type(&mut conn));
        }
        Command::GetPlayerSpellsByClassSpec => {
            println!("{:#?}", get_player_spells_by_class_spec(&mut conn));
        }

        Command::GetFightNote {
            boss_name,
            difficulty,
        } => {
            println!("{:#?}", get_fight_note(&mut conn, boss_name, difficulty));
        }
        Command::UpdateFightNote {
            boss_name,
            difficulty,
            new_note,
        } => {
            println!(
                "{:#?}",
                update_fight_note(&mut conn, boss_name, difficulty, new_note)
            );
        }
    };
}
