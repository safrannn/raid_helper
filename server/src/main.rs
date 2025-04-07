use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use axum::{http::StatusCode, response::IntoResponse};
use clap::Parser;
use rusqlite::Connection;
use server::{
    boss, notes, player,
    timeline::{self, TimelineBossSpellsReturn},
};
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
};
use tower_http::cors::{Any, CorsLayer};
use types::{
    class::{Boss, Raid},
    spell::{BossSpell, PlayerSpell, PlayerSpellsByClassSpec},
};

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
        // default_value = "/home/chengsu/raid_helper/database/raid_helper.db"
        default_value = "../database/raid_helper.db"
    )]
    db: String,
}

#[tokio::main]
async fn main() {
    env_logger::init();

    // server::clap_cli::test_cli();

    // let args = Args::parse();
    // let mut conn: Connection = Connection::open(args.db).expect("Failed to open database");
    // import::boss::import_boss_timeline(&mut conn);

    let args = Args::parse();
    let conn: Connection = Connection::open(args.db).expect("Failed to open database");
    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
    };
    let app = Router::new()
        .route("/list_raid", get(list_raid))
        .route(
            "/get_raid_name_of_boss/{boss_name}",
            get(get_raid_name_of_boss),
        )
        .route("/list_boss_spells/{boss_name}", get(list_boss_spells))
        .route("/list_boss", get(list_boss))
        .route(
            "/get_timeline_boss_spell_by_spell_id/{boss_name}/{difficulty}/{spell_id}",
            get(get_timeline_boss_spell_by_spell_id),
        )
        .route(
            "/get_timeline_boss_spells/{boss_name}/{difficulty}",
            get(get_timeline_boss_spells),
        )
        .route(
            "/update_boss_spell_visibility/{spell_id}/{boss_name}/{difficulty}/{visibility}",
            post(update_boss_spell_visibility),
        )
        .route(
            "/get_fight_note/{boss_name}/{difficulty}",
            get(get_fight_note),
        )
        .route(
            "/update_fight_note/{boss_name}/{difficulty}/{note}",
            post(update_fight_note),
        )
        .route(
            "/add_player/{player_name}/{player_class_name}/{player_spec_name}",
            get(add_player),
        )
        .route(
            "/get_player_class_spec_icon",
            get(get_player_class_spec_icon),
        )
        .route("/get_player_spells", get(get_player_spells))
        .route(
            "/get_player_spells_by_spell_type",
            get(get_player_spells_by_spell_type),
        )
        .route(
            "/get_player_spells_by_class_spec",
            get(get_player_spells_by_class_spec),
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

// Handler for /get_raid_name_of_boss
async fn get_raid_name_of_boss(
    State(state): State<AppState>,
    Path(boss_name): Path<String>,
) -> Json<String> {
    let mut conn = state.db.lock().unwrap();
    Json(boss::get_raid_name_of_boss(&mut conn, boss_name))
}

// Handler for /list_boss_spells
async fn list_boss_spells(
    State(state): State<AppState>,
    Path(boss_name): Path<String>,
) -> Json<Vec<BossSpell>> {
    let mut conn = state.db.lock().unwrap();
    Json(boss::list_boss_spells(&mut conn, boss_name))
}

// Handler for /get_timeline_boss_spell_by_spell_id
async fn get_timeline_boss_spell_by_spell_id(
    State(state): State<AppState>,
    Path((boss_name, difficulty, spell_id)): Path<(String, String, usize)>,
) -> Json<Vec<TimelineBossSpellsReturn>> {
    let mut conn = state.db.lock().unwrap();
    Json(timeline::get_timeline_boss_spell_by_spell_id(
        &mut conn, boss_name, difficulty, spell_id,
    ))
}

// Handler for /get_timeline_boss_spells
async fn get_timeline_boss_spells(
    State(state): State<AppState>,
    Path((boss_name, difficulty)): Path<(String, String)>,
) -> Json<Vec<TimelineBossSpellsReturn>> {
    let mut conn = state.db.lock().unwrap();
    Json(timeline::get_timeline_boss_spells(
        &mut conn, boss_name, difficulty,
    ))
}

// Handler for /update_boss_spell_visibility
async fn update_boss_spell_visibility(
    State(state): State<AppState>,
    Path((spell_id, boss_name, difficulty, visibility)): Path<(usize, String, String, bool)>,
) {
    let mut conn = state.db.lock().unwrap();
    boss::update_boss_spell_visibility(&mut conn, spell_id, boss_name, difficulty, visibility);
}

// Handler for /get_fight_note
async fn get_fight_note(
    State(state): State<AppState>,
    Path((boss_name, difficulty)): Path<(String, String)>,
) -> Json<String> {
    let mut conn = state.db.lock().unwrap();
    Json(notes::get_fight_note(&mut conn, boss_name, difficulty))
}

// Handler for /update_fight_note
async fn update_fight_note(
    State(state): State<AppState>,
    Path((boss_name, difficulty, note)): Path<(String, String, String)>,
) {
    let mut conn = state.db.lock().unwrap();
    let _ = Json(notes::update_fight_note(
        &mut conn, boss_name, difficulty, note,
    ));
}

// Handler for /add_player
async fn add_player(
    State(state): State<AppState>,
    Path((player_name, player_class_name, player_spec_name)): Path<(String, String, String)>,
) -> Json<i32> {
    let mut conn = state.db.lock().unwrap();
    Json(player::add_player(
        &mut conn,
        player_name,
        player_class_name,
        player_spec_name,
    ))
}

// Handler for /get_player_class_spec_icon
async fn get_player_class_spec_icon(
    State(state): State<AppState>,
) -> Json<Vec<(String, String, String)>> {
    let mut conn = state.db.lock().unwrap();
    Json(player::get_player_class_spec_icon(&mut conn))
}

// Handler for /get_player_spells
async fn get_player_spells(State(state): State<AppState>) -> Json<HashSet<PlayerSpell>> {
    let mut conn = state.db.lock().unwrap();
    Json(player::get_player_spells(&mut conn))
}

// Handler for /get_player_spells_by_spell_type
async fn get_player_spells_by_spell_type(
    State(state): State<AppState>,
) -> Json<Vec<(String, Vec<PlayerSpell>)>> {
    let mut conn = state.db.lock().unwrap();
    Json(player::get_player_spells_by_spell_type(&mut conn))
}

// Handler for /get_player_spells_by_class_spec
async fn get_player_spells_by_class_spec(
    State(state): State<AppState>,
) -> Json<Vec<PlayerSpellsByClassSpec>> {
    let mut conn = state.db.lock().unwrap();
    Json(player::get_player_spells_by_class_spec(&mut conn))
}
