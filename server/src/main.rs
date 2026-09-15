use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use axum::{http::StatusCode, response::IntoResponse};
use clap::Parser;
use rusqlite::Connection;
use serde::Deserialize;
use server::{
    boss, notes, player,
    timeline::{self, TimelineBossSpellsReturn, TimelinePlayerListWSpellCasts},
};
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
};
use tower_http::cors::{Any, CorsLayer};
use types::{
    characters::{Boss, Raid},
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
        .route("/get_raid_name_of_boss", get(get_raid_name_of_boss))
        .route("/list_boss_spells", get(list_boss_spells))
        .route("/list_boss", get(list_boss))
        .route(
            "/get_timeline_boss_spell_by_spell_id",
            get(get_timeline_boss_spell_by_spell_id),
        )
        .route("/get_timeline_boss_spells", get(get_timeline_boss_spells))
        .route(
            "/update_boss_spell_visibility",
            post(update_boss_spell_visibility),
        )
        .route("/get_fight_note", get(get_fight_note))
        .route("/update_fight_note", post(update_fight_note))
        .route("/add_player", get(add_player))
        .route("/get_player_class_names", get(get_player_class_names))
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
        .route(
            "/get_timeline_player_list_w_spell_casts",
            get(get_timeline_player_list_w_spell_casts),
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

#[derive(Deserialize)]
struct GetRaidNameOfBossParams {
    boss_name: String,
}
// Handler for /get_raid_name_of_boss
async fn get_raid_name_of_boss(
    State(state): State<AppState>,
    Query(params): Query<GetRaidNameOfBossParams>,
) -> Json<String> {
    let mut conn = state.db.lock().unwrap();
    Json(boss::get_raid_name_of_boss(&mut conn, params.boss_name))
}

#[derive(Deserialize)]
struct ListBossSpellParams {
    boss_name: String,
}
// Handler for /list_boss_spells
async fn list_boss_spells(
    State(state): State<AppState>,
    Query(params): Query<ListBossSpellParams>,
) -> Json<Vec<BossSpell>> {
    let mut conn = state.db.lock().unwrap();
    Json(boss::list_boss_spells(&mut conn, params.boss_name))
}

#[derive(Deserialize)]
struct GetTimelineBossSpellBySpellIdParams {
    boss_name: String,
    difficulty: String,
    spell_id: usize,
}
// Handler for /get_timeline_boss_spell_by_spell_id
async fn get_timeline_boss_spell_by_spell_id(
    State(state): State<AppState>,
    Query(params): Query<GetTimelineBossSpellBySpellIdParams>,
) -> Json<Vec<TimelineBossSpellsReturn>> {
    let mut conn = state.db.lock().unwrap();
    Json(timeline::get_timeline_boss_spell_by_spell_id(
        &mut conn,
        params.boss_name,
        params.difficulty,
        params.spell_id,
    ))
}

// Handler for /get_timeline_boss_spells
async fn get_timeline_boss_spells(
    State(state): State<AppState>,
    Query(params): Query<FightInfoParams>,
) -> Json<Vec<TimelineBossSpellsReturn>> {
    let mut conn = state.db.lock().unwrap();
    Json(timeline::get_timeline_boss_spells(
        &mut conn,
        params.boss_name,
        params.difficulty,
    ))
}

#[derive(Deserialize)]
struct UpdateBossSpellVisibilityParams {
    spell_id: usize,
    boss_name: String,
    difficulty: String,
    visibility: bool,
}

// Handler for /update_boss_spell_visibility
async fn update_boss_spell_visibility(
    State(state): State<AppState>,
    Query(params): Query<UpdateBossSpellVisibilityParams>,
) {
    let mut conn = state.db.lock().unwrap();
    boss::update_boss_spell_visibility(
        &mut conn,
        params.spell_id,
        params.boss_name,
        params.difficulty,
        params.visibility,
    );
}

#[derive(Deserialize)]
struct GetFightNoteParams {
    boss_name: String,
    difficulty: String,
}

// Handler for /get_fight_note
async fn get_fight_note(
    State(state): State<AppState>,
    Query(params): Query<GetFightNoteParams>,
) -> Json<String> {
    let mut conn = state.db.lock().unwrap();
    Json(notes::get_fight_note(
        &mut conn,
        params.boss_name,
        params.difficulty,
    ))
}

#[derive(Deserialize)]
struct UpdateFightNoteParams {
    boss_name: String,
    difficulty: String,
    note: String,
}

// Handler for /update_fight_note
async fn update_fight_note(
    State(state): State<AppState>,
    Query(params): Query<UpdateFightNoteParams>,
) {
    let mut conn = state.db.lock().unwrap();
    let _ = Json(notes::update_fight_note(
        &mut conn,
        params.boss_name,
        params.difficulty,
        params.note,
    ));
}

#[derive(Deserialize)]
struct AddPlayerParams {
    player_name: String,
    player_class_name: String,
    player_spec_name: String,
    boss_name: String,
    difficulty: String,
}

// Handler for /add_player
async fn add_player(
    State(state): State<AppState>,
    Query(params): Query<AddPlayerParams>,
) -> Json<i32> {
    let mut conn = state.db.lock().unwrap();
    Json(player::add_player(
        &mut conn,
        params.player_name,
        params.player_class_name,
        params.player_spec_name,
        params.boss_name,
        params.difficulty,
    ))
}

// Handler for /get_player_class_names
async fn get_player_class_names(State(state): State<AppState>) -> Json<Vec<String>> {
    let mut conn = state.db.lock().unwrap();
    Json(player::get_player_class_names(&mut conn))
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

#[derive(Deserialize)]
struct FightInfoParams {
    boss_name: String,
    difficulty: String,
}

async fn get_timeline_player_list_w_spell_casts(
    State(state): State<AppState>,
    Query(params): Query<FightInfoParams>,
) -> Json<Vec<TimelinePlayerListWSpellCasts>> {
    let mut conn = state.db.lock().unwrap();
    Json(timeline::get_timeline_player_list_w_spell_casts(
        &mut conn,
        params.boss_name,
        params.difficulty,
    ))
}
