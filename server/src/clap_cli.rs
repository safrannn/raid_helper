use crate::{boss::*, timeline::get_timeline_boss_spells};
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

    GetTimelineBossSpells {
        boss_name: String,
        raid_difficulty: String,
    },
}

pub fn test_cli() {
    info!("test_cli");
    let CargoCli::Command(cli) = CargoCli::parse();
    let command = cli.command;
    let mut conn = Connection::open("database.sqlite").expect("Failed to open database");

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
            raid_difficulty,
        } => {
            println!(
                "{:#?}",
                get_timeline_boss_spells(&mut conn, boss_name, raid_difficulty)
            );
        }
    };
}
