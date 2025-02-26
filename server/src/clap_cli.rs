use crate::boss::*;
use clap::{Parser, Subcommand};
use log::info;

pub fn test_cli() {
    info!("test_cli");
    let CargoCli::Command(cli) = CargoCli::parse();
    let command = cli.command;

    match command {
        Command::ListRaid => println!("{:#?}", list_raid()),
        Command::ListBoss { of_raid } => {
            if let Some(raid_name) = of_raid {
                println!("{:#?}", list_boss_of_raid(raid_name));
            } else {
                println!("{:#?}", list_boss_by_raid());
            }
        }
    };
}

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
}
