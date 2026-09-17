use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{header, StatusCode, Uri},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use clap::Parser;
use rusqlite::Connection;
use rust_embed::Embed;
use serde::Deserialize;
use server::{
    boss, notes, player,
    timeline::{self, TimelineBossSpellsReturn, TimelinePlayerListWSpellCasts},
};
use std::{
    collections::HashSet,
    path::PathBuf,
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

// frontend build target
#[derive(Embed)]
#[folder = "../frontend/out/"]
struct FrontendAssets;

const DB: &[u8] = include_bytes!("../../database/raid_helper.db");

#[derive(Parser)]
struct Args {
    #[arg(long, env, default_value = "0.0.0.0:3001")]
    addr: String,
    #[arg(long, env)]
    db: Option<PathBuf>,
}

fn resolve_db_path(arg: Option<PathBuf>) -> PathBuf {
    let path = arg.unwrap_or_else(|| {
        std::env::current_exe()
            .expect("cannot locate executable")
            .parent()
            .expect("executable has no parent dir")
            .join("raid_helper.db")
    });
    if !path.exists() {
        std::fs::write(&path, DB).expect("Failed to write seed database");
        log::info!("Created database at {}", path.display());
    }
    path
}

#[tokio::main]
async fn main() {
    env_logger::init();

    // server::clap_cli::test_cli();
    // server::clap_cli::import_boss();

    // let args = Args::parse();
    // let mut conn: Connection = Connection::open(args.db).expect("Failed to open database");
    // import::boss::import_boss_timeline(&mut conn);

    let args = Args::parse();
    let db_path = resolve_db_path(args.db);
    let conn: Connection = Connection::open(&db_path).expect("Failed to open database");
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
        .route("/update_player", post(update_player))
        .route("/add_player_spell_cast", post(add_player_spell_cast))
        .route("/remove_player_spell_cast", post(remove_player_spell_cast))
        .route("/update_player_spell_cast", post(update_player_spell_cast))
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
        .layer(CorsLayer::new().allow_origin(Any))
        .fallback(static_handler); // for frontend access

    // Set the address and start the server
    let listener = tokio::net::TcpListener::bind(&args.addr).await.unwrap();
    log::info!("Listening on http://{}", args.addr);
    axum::serve(listener, app).await.unwrap();
}

// async fn handler_404() -> impl IntoResponse {
//     (StatusCode::NOT_FOUND, "nothing to see here")
// }

async fn static_handler(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    let file = FrontendAssets::get(path)
        .or_else(|| FrontendAssets::get(&format!("{path}.html")))
        .or_else(|| FrontendAssets::get(&format!("{path}/index.html")));

    match file {
        Some(f) => {
            let mime = f.metadata.mimetype();
            (
                [(header::CONTENT_TYPE, mime)],
                Body::from(f.data.into_owned()),
            )
                .into_response()
        }
        None => (StatusCode::NOT_FOUND, "empty").into_response(),
    }
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

#[derive(Deserialize)]
struct UpdatePlayerParams {
    player_id: usize,
    player_name: String,
    player_class_name: String,
    player_spec_name: String,
}

// Handler for /update_player
async fn update_player(
    State(state): State<AppState>,
    Query(params): Query<UpdatePlayerParams>,
) -> Json<i32> {
    let mut conn = state.db.lock().unwrap();
    Json(player::update_player(
        &mut conn,
        params.player_id,
        params.player_name,
        params.player_class_name,
        params.player_spec_name,
    ))
}

#[derive(Deserialize)]
struct AddPlayerSpellCastParams {
    player_id: usize,
    spell_id: usize,
    start_time_in_sec: f32,
}

// Handler for /add_player_spell_cast
async fn add_player_spell_cast(
    State(state): State<AppState>,
    Query(params): Query<AddPlayerSpellCastParams>,
) -> Json<i64> {
    let mut conn = state.db.lock().unwrap();
    Json(player::add_player_spell_cast(
        &mut conn,
        params.player_id,
        params.spell_id,
        params.start_time_in_sec,
    ))
}

#[derive(Deserialize)]
struct RemovePlayerSpellCastParams {
    keyframe_group_id: usize,
}

// Handler for /remove_player_spell_cast
async fn remove_player_spell_cast(
    State(state): State<AppState>,
    Query(params): Query<RemovePlayerSpellCastParams>,
) -> Json<bool> {
    let mut conn = state.db.lock().unwrap();
    Json(player::remove_player_spell_cast(
        &mut conn,
        params.keyframe_group_id,
    ))
}

#[derive(Deserialize)]
struct UpdatePlayerSpellCastParams {
    keyframe_group_id: usize,
    start_time_in_sec: f32,
}

// Handler for /update_player_spell_cast
async fn update_player_spell_cast(
    State(state): State<AppState>,
    Query(params): Query<UpdatePlayerSpellCastParams>,
) -> Json<bool> {
    let mut conn = state.db.lock().unwrap();
    Json(player::update_player_spell_cast(
        &mut conn,
        params.keyframe_group_id,
        params.start_time_in_sec,
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
