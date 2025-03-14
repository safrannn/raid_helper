use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use axum::{http::StatusCode, response::IntoResponse};
use clap::Parser;
use rusqlite::Connection;
use server::{
    boss,
    timeline::{self, TimelineBossSpellsReturn},
};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use types::class::{Boss, Raid};
use utils::connect_to_db;

#[derive(Clone)]
struct AppState {
    db: Arc<Mutex<Connection>>,
}

#[derive(Parser)]
struct Args {
    #[arg(long, env, default_value = "0.0.0.0:3001")]
    addr: String,
    #[arg(
        long,
        env,
        default_value = "/home/chengsu/raid_helper/database/raid_helper.db"
    )]
    db: String,
}

#[tokio::main]
async fn main() {
    env_logger::init();
    let args = Args::parse();
    let conn: Connection = Connection::open(args.db).expect("Failed to open database");

    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
    };

    // import::boss::import_boss_timeline();
    // import::boss::import_boss_spells();
    // server::clap_cli::test_cli();

    // Create a router with a single endpoint
    let app = Router::new()
        .route("/list_raid", get(list_raid))
        .route("/list_boss", get(list_boss))
        .route(
            "/get_timeline_boss_spells/{boss_name}/{raid_difficulty}",
            get(get_timeline_boss_spells),
        )
        .with_state(state)
        .layer(CorsLayer::new().allow_origin(Any)); // Allow frontend access
    let app = app.fallback(handler_404);

    // Set the address and start the server
    let listener = tokio::net::TcpListener::bind(args.addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "nothing to see here")
}

// Handler for /list_raid
async fn list_raid(State(state): State<AppState>) -> Json<Vec<Raid>> {
    let mut conn = state.db.lock().unwrap();
    Json(boss::list_raid(&mut conn))
}

// Handler for /list_boss
async fn list_boss(State(state): State<AppState>) -> Json<Vec<(String, Vec<Boss>)>> {
    let mut conn = state.db.lock().unwrap();
    Json(boss::list_boss_by_raid(&mut conn))
}

// Handler for /get_timeline_boss_spells
async fn get_timeline_boss_spells(
    State(state): State<AppState>,
    Path((boss_name, raid_difficulty)): Path<(String, String)>,
) -> Json<Vec<TimelineBossSpellsReturn>> {
    let mut conn = state.db.lock().unwrap();
    Json(timeline::get_timeline_boss_spells(
        &mut conn,
        boss_name,
        raid_difficulty,
    ))
}
