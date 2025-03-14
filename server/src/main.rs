use axum::{extract::Path, routing::get, Json, Router};
use server::{boss, timeline::{self, TimelineBossSpellsReturn}};
use tower_http::cors::{Any, CorsLayer};
use types::class::{Boss, Raid};
use axum::{
    http::StatusCode,
    response::IntoResponse,
};


#[tokio::main]
async fn main() {
    env_logger::init();
    // import::boss::import_boss_timeline();
    // import::boss::import_boss_spells();
    // server::clap_cli::test_cli();

    // Create a router with a single endpoint
    let app = Router::new()
        .route("/list_raid", get(list_raid))
        .route("/list_boss", get(list_boss))
        .route("/get_timeline_boss_spells/{boss_name}/{raid_difficulty}", get(get_timeline_boss_spells))
        .layer(CorsLayer::new().allow_origin(Any)); // Allow frontend access
    let app = app.fallback(handler_404);

    // Set the address and start the server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "nothing to see here")
}

// Handler for /list_raid
async fn list_raid() -> Json<Vec<Raid>> {
    Json(boss::list_raid())
}

// Handler for /list_boss
async fn list_boss() -> Json<Vec<(String, Vec<Boss>)>> {
    Json(boss::list_boss_by_raid())
}

// Handler for /get_timeline_boss_spells
async fn get_timeline_boss_spells(Path((boss_name, raid_difficulty)): Path<(String, String)>) -> Json<Vec<TimelineBossSpellsReturn>> {
    Json(timeline::get_timeline_boss_spells(boss_name, raid_difficulty))
}
