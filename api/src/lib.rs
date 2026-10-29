use axum::{
    Json, Router,
    extract::{Path, Query, State, rejection::JsonRejection},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, patch, post},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{FromRow, SqlitePool};
use std::{collections::HashSet, env};
use subtle::ConstantTimeEq;
use thiserror::Error;
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer};
use url::form_urlencoded;
use uuid::Uuid;

pub const WHATSAPP_NUMBER: &str = "2348157727770";

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub admin_api_key: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub host: String,
    pub port: u16,
    pub admin_api_key: Option<String>,
    pub cors_origins: Vec<HeaderValue>,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let origins = env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000,http://localhost:3001".to_owned())
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
            .map(str::parse::<HeaderValue>)
            .collect::<Result<Vec<_>, _>>()?;
        if origins.is_empty() {
            return Err("CORS_ALLOWED_ORIGINS must contain at least one origin".into());
        }
        Ok(Self {
            database_url: env::var("DATABASE_URL").unwrap_or_else(|_| {
                let path = env::var("DB_PATH").unwrap_or_else(|_| "marvels-kitchen.sqlite3".into());
                format!("sqlite://{path}?mode=rwc")
            }),
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            port: env::var("PORT").unwrap_or_else(|_| "8080".into()).parse()?,
            admin_api_key: env::var("ADMIN_API_KEY").ok().filter(|key| !key.is_empty()),
            cors_origins: origins,
        })
    }
}

#[derive(Debug, Error)]
enum ApiError {
    #[error("{0}")]
    Invalid(String),
    #[error("Not found")]
    NotFound,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Internal server error")]
    Internal(#[from] sqlx::Error),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::Invalid(message) => (StatusCode::BAD_REQUEST, message),
            ApiError::NotFound => (StatusCode::NOT_FOUND, "Order not found".into()),
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            ApiError::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".into(),
            ),
        };
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}

#[derive(Clone, Serialize)]
pub struct MenuItem {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub amount_ngn: i64,
    pub category: &'static str,
    pub image_url: &'static str,
    pub image_alt: &'static str,
    pub includes_complimentary_swallow: bool,
}

pub fn menu() -> Vec<MenuItem> {
    vec![
        item(
            "jollof-rice",
            "Jollof Rice",
            "A much-loved West African rice dish with rich tomato and pepper flavours.",
            4500,
            "Rice Dishes",
            "/assets/menu/jollof.jpg",
            "Illustrative food photograph for Jollof Rice",
            false,
        ),
        item(
            "fried-rice",
            "Fried Rice",
            "Colourful rice with vegetables and a satisfying mix of savoury flavours.",
            5000,
            "Rice Dishes",
            "/assets/menu/fried-rice.jpg",
            "Illustrative food photograph for Fried Rice",
            false,
        ),
        item(
            "ofada-rice",
            "Ofada Rice",
            "A beloved local rice favourite, served with a rich pepper sauce.",
            5500,
            "Rice Dishes",
            "/assets/menu/ofada-rice.jpg",
            "Illustrative food photograph for Ofada Rice",
            false,
        ),
        item(
            "egusi-soup",
            "Egusi Soup",
            "A hearty melon-seed soup inspired by traditional Nigerian cooking. Includes one complimentary swallow of your choice.",
            4000,
            "Soups and Swallows",
            "/assets/menu/egusi-soup.jpg",
            "Illustrative food photograph for Egusi Soup",
            true,
        ),
        item(
            "okra-soup",
            "Okra Soup",
            "A comforting, flavourful soup. Includes one complimentary swallow of your choice.",
            3800,
            "Soups and Swallows",
            "/assets/menu/okra-soup.jpg",
            "Illustrative food photograph for Okra Soup",
            true,
        ),
        item(
            "pounded-yam",
            "Pounded Yam",
            "A soft, satisfying swallow pairing for your favourite soup.",
            1800,
            "Soups and Swallows",
            "/assets/menu/pounded-yam.jpg",
            "Illustrative food photograph for Pounded Yam",
            false,
        ),
        item(
            "grilled-chicken",
            "Grilled Chicken",
            "A savoury protein option with a deliciously seasoned finish.",
            3500,
            "Proteins and Sides",
            "/assets/menu/grilled-chicken.jpg",
            "Illustrative food photograph for Grilled Chicken",
            false,
        ),
        item(
            "moi-moi",
            "Moi Moi",
            "A tender steamed bean pudding and a versatile meal-time favourite.",
            1500,
            "Proteins and Sides",
            "/assets/menu/moi-moi.jpg",
            "Illustrative food photograph for Moi Moi",
            false,
        ),
        item(
            "meat-pie",
            "Meat Pie",
            "A golden, savoury pastry idea for a quick bite or a light snack.",
            1200,
            "Snacks",
            "/assets/menu/meat-pie.jpg",
            "Illustrative food photograph for Meat Pie",
            false,
        ),
        item(
            "puff-puff",
            "Puff-Puff",
            "A soft, golden snack made for sharing and enjoying together.",
            1000,
            "Snacks",
            "/assets/menu/puff-puff.jpg",
            "Illustrative food photograph for Puff-Puff",
            false,
        ),
        item(
            "fresh-zobo",
            "Fresh Zobo",
            "A refreshing hibiscus drink, perfect alongside a lovely meal.",
            1000,
            "Drinks",
            "/assets/menu/zobo.jpg",
            "Illustrative food photograph for Zobo",
            false,
        ),
        item(
            "fruit-juice",
            "Fruit Juice",
            "A bright, fruity drink to round out your meal.",
            1500,
            "Drinks",
            "/assets/menu/juice.jpg",
            "Illustrative food photograph for Fruit Juice",
            false,
        ),
    ]
}

fn item(
    id: &'static str,
    name: &'static str,
    description: &'static str,
    amount_ngn: i64,
    category: &'static str,
    image_url: &'static str,
    image_alt: &'static str,
    includes_complimentary_swallow: bool,
) -> MenuItem {
    MenuItem {
        id,
        name,
        description,
        amount_ngn,
        category,
        image_url,
        image_alt,
        includes_complimentary_swallow,
    }
}

pub async fn initialize_database(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            fulfillment TEXT NOT NULL CHECK (fulfillment IN ('Pickup', 'Delivery')),
            delivery_address TEXT,
            preferred_swallow TEXT,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            subtotal_ngn INTEGER NOT NULL CHECK (subtotal_ngn >= 0),
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            item_id TEXT NOT NULL,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            unit_amount_ngn INTEGER NOT NULL CHECK (unit_amount_ngn >= 0)
        )",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)")
        .execute(pool)
        .await?;
    Ok(())
}

pub fn app(state: AppState, origins: Vec<HeaderValue>) -> Router {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/menu", get(get_menu))
        .route("/api/orders", post(create_order))
        .route("/api/admin/orders", get(list_orders))
        .route("/api/admin/orders/{id}/status", patch(update_status))
        .layer(RequestBodyLimitLayer::new(1024 * 1024))
        .layer(
            CorsLayer::new()
                .allow_origin(origins)
                .allow_methods([
                    axum::http::Method::GET,
                    axum::http::Method::POST,
                    axum::http::Method::PATCH,
                    axum::http::Method::OPTIONS,
                ])
                .allow_headers([
                    header::CONTENT_TYPE,
                    header::ACCEPT,
                    "x-admin-api-key".parse().unwrap(),
                ]),
        )
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}

async fn get_menu() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "business": { "whatsapp": WHATSAPP_NUMBER },
        "items": menu()
    }))
}

#[derive(Debug, Deserialize, Clone, Copy)]
enum Fulfillment {
    Pickup,
    Delivery,
}

impl Fulfillment {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Pickup => "Pickup",
            Self::Delivery => "Delivery",
        }
    }
}

#[derive(Debug, Deserialize)]
struct OrderRequest {
    customer: CustomerDetails,
    fulfillment: Fulfillment,
    delivery_address: Option<String>,
    preferred_swallow: Option<String>,
    notes: Option<String>,
    items: Vec<OrderLineRequest>,
}

#[derive(Debug, Deserialize)]
struct CustomerDetails {
    name: String,
    phone: String,
    email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OrderLineRequest {
    item_id: String,
    quantity: i64,
}

#[derive(Serialize)]
struct OrderCreated {
    order_id: String,
    status: &'static str,
    subtotal_ngn: i64,
    delivery_fee_ngn: Option<i64>,
    total_ngn: Option<i64>,
    whatsapp_url: String,
}

struct PricedLine {
    item: MenuItem,
    quantity: i64,
}

fn validate_and_price(
    request: OrderRequest,
) -> Result<(OrderRequest, Vec<PricedLine>, i64), ApiError> {
    let name = request.customer.name.trim();
    if name.is_empty() || name.chars().count() > 100 {
        return Err(ApiError::Invalid(
            "customer_name is required and must be at most 100 characters".into(),
        ));
    }
    let phone = request.customer.phone.trim();
    let phone_digits = phone.chars().filter(char::is_ascii_digit).count();
    if !(7..=20).contains(&phone_digits)
        || phone.len() > 30
        || !phone
            .chars()
            .all(|c| c.is_ascii_digit() || matches!(c, '+' | ' ' | '(' | ')' | '-'))
    {
        return Err(ApiError::Invalid(
            "customer_phone must be a valid phone number".into(),
        ));
    }
    if let Some(email) = request
        .customer
        .email
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        let email = email.trim();
        let mut parts = email.split('@');
        let local = parts.next().unwrap_or_default();
        let domain = parts.next().unwrap_or_default();
        if parts.next().is_some()
            || local.is_empty()
            || domain.len() < 3
            || !domain.contains('.')
            || email.len() > 254
            || email.chars().any(char::is_whitespace)
        {
            return Err(ApiError::Invalid(
                "customer_email must be a valid email address".into(),
            ));
        }
    }
    if let Some(address) = request.delivery_address.as_deref() {
        if address.trim().len() > 500 {
            return Err(ApiError::Invalid(
                "delivery_address must be at most 500 characters".into(),
            ));
        }
    }
    if let Some(notes) = request.notes.as_deref() {
        if notes.trim().len() > 1000 {
            return Err(ApiError::Invalid(
                "notes must be at most 1000 characters".into(),
            ));
        }
    }
    if matches!(request.fulfillment, Fulfillment::Delivery)
        && request
            .delivery_address
            .as_deref()
            .unwrap_or_default()
            .trim()
            .is_empty()
    {
        return Err(ApiError::Invalid(
            "delivery_address is required for Delivery".into(),
        ));
    }
    if request.items.is_empty() || request.items.len() > 50 {
        return Err(ApiError::Invalid(
            "items must contain between 1 and 50 distinct items".into(),
        ));
    }
    let catalog = menu();
    let mut seen = HashSet::new();
    let mut priced = Vec::with_capacity(request.items.len());
    let mut subtotal = 0i64;
    for line in &request.items {
        if !(1..=50).contains(&line.quantity) {
            return Err(ApiError::Invalid(
                "each item quantity must be between 1 and 50".into(),
            ));
        }
        if !seen.insert(line.item_id.as_str()) {
            return Err(ApiError::Invalid(
                "duplicate item_id values are not allowed".into(),
            ));
        }
        let item = catalog
            .iter()
            .find(|item| item.id == line.item_id)
            .cloned()
            .ok_or_else(|| ApiError::Invalid(format!("Unknown item_id: {}", line.item_id)))?;
        subtotal = subtotal
            .checked_add(
                item.amount_ngn
                    .checked_mul(line.quantity)
                    .ok_or_else(|| ApiError::Invalid("order amount is too large".into()))?,
            )
            .ok_or_else(|| ApiError::Invalid("order amount is too large".into()))?;
        priced.push(PricedLine {
            item,
            quantity: line.quantity,
        });
    }
    if priced
        .iter()
        .any(|line| line.item.includes_complimentary_swallow)
        && request
            .preferred_swallow
            .as_deref()
            .unwrap_or_default()
            .trim()
            .is_empty()
    {
        return Err(ApiError::Invalid(
            "preferred_swallow is required when the order includes soup".into(),
        ));
    }
    if request
        .preferred_swallow
        .as_deref()
        .map_or(false, |value| value.trim().chars().count() > 100)
    {
        return Err(ApiError::Invalid(
            "preferred_swallow must be at most 100 characters".into(),
        ));
    }
    Ok((request, priced, subtotal))
}

async fn create_order(
    State(state): State<AppState>,
    body: Result<Json<OrderRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<OrderCreated>), ApiError> {
    let Json(body) = body.map_err(|error| ApiError::Invalid(error.body_text()))?;
    let (request, lines, subtotal) = validate_and_price(body)?;
    let order_id = Uuid::new_v4().to_string();
    let mut tx = state.pool.begin().await?;
    sqlx::query(
        "INSERT INTO orders (id, customer_name, customer_phone, customer_email, fulfillment, delivery_address, preferred_swallow, notes, subtotal_ngn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&order_id)
    .bind(request.customer.name.trim())
    .bind(request.customer.phone.trim())
    .bind(request.customer.email.as_deref().filter(|value| !value.trim().is_empty()).map(str::trim))
    .bind(request.fulfillment.as_str())
    .bind(request.delivery_address.as_deref().filter(|value| !value.trim().is_empty()).map(str::trim))
    .bind(request.preferred_swallow.as_deref().filter(|value| !value.trim().is_empty()).map(str::trim))
    .bind(request.notes.as_deref().filter(|value| !value.trim().is_empty()).map(str::trim))
    .bind(subtotal)
    .execute(&mut *tx).await?;
    for line in &lines {
        sqlx::query("INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_amount_ngn) VALUES (?, ?, ?, ?, ?)")
            .bind(&order_id).bind(line.item.id).bind(line.item.name).bind(line.quantity).bind(line.item.amount_ngn)
            .execute(&mut *tx).await?;
    }
    tx.commit().await?;

    let message = whatsapp_summary(&order_id, &request, &lines, subtotal);
    let encoded = form_urlencoded::byte_serialize(message.as_bytes()).collect::<String>();
    let response = OrderCreated {
        order_id,
        status: "pending",
        subtotal_ngn: subtotal,
        delivery_fee_ngn: if matches!(request.fulfillment, Fulfillment::Pickup) {
            Some(0)
        } else {
            None
        },
        total_ngn: if matches!(request.fulfillment, Fulfillment::Pickup) {
            Some(subtotal)
        } else {
            None
        },
        whatsapp_url: format!("https://wa.me/{WHATSAPP_NUMBER}?text={encoded}"),
    };
    Ok((StatusCode::CREATED, Json(response)))
}

fn whatsapp_summary(
    order_id: &str,
    request: &OrderRequest,
    lines: &[PricedLine],
    subtotal: i64,
) -> String {
    let mut lines_text = lines
        .iter()
        .map(|line| {
            format!(
                "• {} × {} — ₦{}{}",
                line.item.name,
                line.quantity,
                line.item.amount_ngn * line.quantity,
                if line.item.includes_complimentary_swallow {
                    " (includes complimentary swallow)"
                } else {
                    ""
                }
            )
        })
        .collect::<Vec<_>>();
    if lines
        .iter()
        .any(|line| line.item.includes_complimentary_swallow)
    {
        lines_text.push(format!(
            "Complimentary swallow choice: {}",
            request
                .preferred_swallow
                .as_deref()
                .unwrap_or_default()
                .trim()
        ));
    }
    lines_text.push(format!("Subtotal: ₦{subtotal}"));
    if matches!(request.fulfillment, Fulfillment::Delivery) {
        lines_text.push("Delivery fee: To be confirmed by the kitchen.".into());
        lines_text.push(format!("Total: ₦{subtotal} plus confirmed delivery fee"));
    } else {
        lines_text.push(format!("Total: ₦{subtotal}"));
    }
    lines_text.push(format!("Customer: {}", request.customer.name.trim()));
    lines_text.push(format!("Phone: {}", request.customer.phone.trim()));
    if let Some(email) = request
        .customer
        .email
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        lines_text.push(format!("Email: {}", email.trim()));
    }
    if matches!(request.fulfillment, Fulfillment::Delivery) {
        lines_text.push(format!(
            "Delivery address: {}",
            request
                .delivery_address
                .as_deref()
                .unwrap_or_default()
                .trim()
        ));
    } else {
        lines_text.push("Fulfilment: Pickup".into());
    }
    if let Some(notes) = request
        .notes
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        lines_text.push(format!("Order notes: {}", notes.trim()));
    }
    format!(
        "Hello Marvel’s Kitchen! I would like to place an order.\n\nORDER ID: {order_id}\nORDER SUMMARY\n{}\n\nPlease confirm item availability, fulfilment details, and payment. No payment has been collected.",
        lines_text.join("\n")
    )
}

fn authorized(headers: &HeaderMap, configured: Option<&str>) -> bool {
    let Some(expected) = configured else {
        return false;
    };
    let Some(supplied) = headers
        .get("x-admin-api-key")
        .and_then(|value| value.to_str().ok())
    else {
        return false;
    };
    let expected_hash = Sha256::digest(expected.as_bytes());
    let supplied_hash = Sha256::digest(supplied.as_bytes());
    bool::from(expected_hash.as_slice().ct_eq(supplied_hash.as_slice()))
}

#[derive(Debug, Deserialize)]
struct OrderFilters {
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
    fulfillment: Option<String>,
}

#[derive(Serialize, FromRow)]
struct OrderRow {
    id: String,
    customer_name: String,
    customer_phone: String,
    customer_email: Option<String>,
    fulfillment: String,
    delivery_address: Option<String>,
    preferred_swallow: Option<String>,
    notes: Option<String>,
    status: String,
    subtotal_ngn: i64,
    created_at: String,
}

#[derive(Serialize, FromRow)]
struct OrderItemRow {
    item_id: String,
    item_name: String,
    quantity: i64,
    unit_price_ngn: i64,
    line_total_ngn: i64,
}

#[derive(Serialize)]
struct AdminOrder {
    #[serde(flatten)]
    order: OrderRow,
    items: Vec<OrderItemRow>,
}

#[derive(Serialize)]
struct PaginatedOrders {
    page: u32,
    limit: u32,
    total: i64,
    orders: Vec<AdminOrder>,
}

async fn list_orders(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(filters): Query<OrderFilters>,
) -> Result<Json<PaginatedOrders>, ApiError> {
    if !authorized(&headers, state.admin_api_key.as_deref()) {
        return Err(ApiError::Unauthorized);
    }
    let page = filters.page.unwrap_or(1).max(1);
    let limit = filters.limit.unwrap_or(20).clamp(1, 100);
    let offset = i64::from(page.saturating_sub(1)) * i64::from(limit);
    if let Some(status) = filters.status.as_deref() {
        if !valid_status(status) {
            return Err(ApiError::Invalid("invalid status filter".into()));
        }
    }
    if let Some(fulfillment) = filters.fulfillment.as_deref() {
        if !matches!(fulfillment, "Pickup" | "Delivery") {
            return Err(ApiError::Invalid("invalid fulfillment filter".into()));
        }
    }
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM orders WHERE (? IS NULL OR status = ?) AND (? IS NULL OR fulfillment = ?)",
    ).bind(filters.status.as_deref()).bind(filters.status.as_deref())
     .bind(filters.fulfillment.as_deref()).bind(filters.fulfillment.as_deref()).fetch_one(&state.pool).await?;
    let rows = sqlx::query_as::<_, OrderRow>(
        "SELECT id, customer_name, customer_phone, customer_email, fulfillment, delivery_address, preferred_swallow, notes, status, subtotal_ngn, created_at
         FROM orders WHERE (? IS NULL OR status = ?) AND (? IS NULL OR fulfillment = ?)
         ORDER BY created_at DESC LIMIT ? OFFSET ?",
    ).bind(filters.status.as_deref()).bind(filters.status.as_deref())
     .bind(filters.fulfillment.as_deref()).bind(filters.fulfillment.as_deref())
     .bind(i64::from(limit)).bind(offset).fetch_all(&state.pool).await?;
    let mut orders = Vec::with_capacity(rows.len());
    for order in rows {
        let items = sqlx::query_as::<_, OrderItemRow>(
            "SELECT item_id, item_name, quantity, unit_amount_ngn AS unit_price_ngn,
                    quantity * unit_amount_ngn AS line_total_ngn
             FROM order_items WHERE order_id = ? ORDER BY id",
        )
        .bind(&order.id)
        .fetch_all(&state.pool)
        .await?;
        orders.push(AdminOrder { order, items });
    }
    Ok(Json(PaginatedOrders {
        page,
        limit,
        total: total.0,
        orders,
    }))
}

#[derive(Deserialize)]
struct StatusUpdate {
    status: String,
}

fn valid_status(status: &str) -> bool {
    matches!(
        status,
        "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled"
    )
}

async fn update_status(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    update: Result<Json<StatusUpdate>, JsonRejection>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !authorized(&headers, state.admin_api_key.as_deref()) {
        return Err(ApiError::Unauthorized);
    }
    let Json(update) = update.map_err(|error| ApiError::Invalid(error.body_text()))?;
    if !valid_status(&update.status) {
        return Err(ApiError::Invalid(
            "status must be pending, confirmed, preparing, ready, completed, or cancelled".into(),
        ));
    }
    let result = sqlx::query("UPDATE orders SET status = ? WHERE id = ?")
        .bind(&update.status)
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }
    Ok(Json(
        serde_json::json!({ "order_id": id, "status": update.status }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use http_body_util::BodyExt;
    use sqlx::sqlite::SqlitePoolOptions;
    use tower::ServiceExt;

    async fn test_app() -> Router {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        initialize_database(&pool).await.unwrap();
        app(
            AppState {
                pool,
                admin_api_key: Some("test-admin-secret".into()),
            },
            vec!["http://localhost:3000".parse().unwrap()],
        )
    }

    async fn json_response(response: axum::response::Response) -> serde_json::Value {
        serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap()
    }

    fn sample_order() -> serde_json::Value {
        serde_json::json!({
            "customer": {
                "name": "A Customer",
                "phone": "+234 801 234 5678"
            },
            "fulfillment": "Pickup",
            "items": [{ "item_id": "jollof-rice", "quantity": 2 }]
        })
    }

    #[tokio::test]
    async fn health_and_menu_are_available_with_stable_catalogue() {
        let app = test_app().await;
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(json_response(response).await["status"], "ok");
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/menu")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let body = json_response(response).await;
        assert_eq!(body["business"]["whatsapp"], WHATSAPP_NUMBER);
        assert!(body["items"].is_array());
        assert_eq!(body["items"][3]["id"], "egusi-soup");
        assert_eq!(body["items"][3]["includes_complimentary_swallow"], true);
    }

    #[tokio::test]
    async fn persists_order_and_uses_server_catalogue_prices() {
        let app = test_app().await;
        let mut request_body = sample_order();
        request_body["items"][0]["amount_ngn"] = serde_json::json!(1);
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/orders")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(request_body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);
        let body = json_response(response).await;
        assert_eq!(body["subtotal_ngn"], 9000);
        assert_eq!(body["delivery_fee_ngn"], 0);
        assert_eq!(body["total_ngn"], 9000);
        assert!(
            body["whatsapp_url"]
                .as_str()
                .unwrap()
                .contains(&body["order_id"].as_str().unwrap())
        );
    }

    #[tokio::test]
    async fn rejects_invalid_delivery_and_missing_soup_choice() {
        let app = test_app().await;
        let mut delivery = sample_order();
        delivery["fulfillment"] = serde_json::json!("Delivery");
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/orders")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(delivery.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let mut soup = sample_order();
        soup["items"][0]["item_id"] = serde_json::json!("okra-soup");
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/orders")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(soup.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn admin_is_protected_and_lists_persisted_orders() {
        let app = test_app().await;
        let create = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/orders")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(sample_order().to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(create.status(), StatusCode::CREATED);
        let missing_auth = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/admin/orders")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(missing_auth.status(), StatusCode::UNAUTHORIZED);
        let authorized = app
            .oneshot(
                Request::builder()
                    .uri("/api/admin/orders")
                    .header("x-admin-api-key", "test-admin-secret")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(authorized.status(), StatusCode::OK);
        let listed = json_response(authorized).await;
        assert_eq!(listed["total"], 1);
        assert_eq!(listed["orders"][0]["customer_name"], "A Customer");
        assert_eq!(listed["orders"][0]["items"][0]["item_name"], "Jollof Rice");
        assert_eq!(listed["orders"][0]["items"][0]["unit_price_ngn"], 4500);
        assert_eq!(listed["orders"][0]["items"][0]["line_total_ngn"], 9000);
    }

    #[tokio::test]
    async fn admin_can_update_order_status() {
        let app = test_app().await;
        let create = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/orders")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(sample_order().to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        let order_id = json_response(create).await["order_id"]
            .as_str()
            .unwrap()
            .to_owned();

        let response = app
            .oneshot(
                Request::builder()
                    .method("PATCH")
                    .uri(format!("/api/admin/orders/{order_id}/status"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("x-admin-api-key", "test-admin-secret")
                    .body(Body::from(r#"{"status":"preparing"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(json_response(response).await["status"], "preparing");
    }
}
