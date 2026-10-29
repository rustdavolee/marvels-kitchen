# Marvel’s Kitchen API

A self-contained Axum + SQLite order API. Run commands from this `api` directory:

```powershell
Copy-Item .env.example .env
# Set ADMIN_API_KEY in .env to a unique, long secret before exposing admin routes.
rustup run stable cargo run
```

The service listens on `http://127.0.0.1:8080` by default. It creates its schema on startup. The database file is durable at `DB_PATH` (default `marvels-kitchen.sqlite3` relative to the API working directory). `DATABASE_URL`, when provided, takes precedence over `DB_PATH`. Never commit `.env` or production credentials. If `ADMIN_API_KEY` is unset, all admin requests remain unauthorized.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Bind address; use `0.0.0.0` in a container |
| `PORT` | `8080` | TCP port |
| `DB_PATH` | `marvels-kitchen.sqlite3` | Durable SQLite file |
| `DATABASE_URL` | derived from `DB_PATH` | Optional complete SQLx SQLite URL |
| `ADMIN_API_KEY` | unset | Required secret for admin endpoints |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Comma-separated exact browser origins |

## Frontend API contract

All amounts are integer Nigerian naira (NGN), not kobo. The current menu and prices are sample placeholders, not approved business pricing; replace them in `src/lib.rs` before accepting live orders. The API-provided menu is authoritative during checkout; clients must not treat a client-supplied amount as authoritative. API errors are JSON: `{"error":"..."}`. Customer order submissions persist to SQLite; they do not charge payment or confirm delivery arrangements. A `whatsapp_url` is created only after the database transaction commits.

### `GET /api/health`

Returns `{"status":"ok"}`.

### `GET /api/menu`

Returns `{"business":{"whatsapp":"2348157727770"},"items":[...]}`. The `business.whatsapp` value is the single editable source used for both contact and order links; change `WHATSAPP_NUMBER` near the top of `src/lib.rs` when the business number changes. Each item has stable `id`, `name`, `description`, `amount_ngn`, `category`, `image_url`, `image_alt`, and `includes_complimentary_swallow`. `Egusi Soup` and `Okra Soup` include one complimentary swallow; `Pounded Yam` is a separate menu item, not itself soup. The contact phone is `08119000048`.

### `POST /api/orders`

Send `Content-Type: application/json` with:

```json
{
  "customer": {
    "name": "Ada Customer",
    "phone": "+234 801 234 5678",
    "email": "ada@example.com"
  },
  "fulfillment": "Pickup",
  "delivery_address": null,
  "preferred_swallow": "Pounded Yam",
  "notes": "Please call on arrival",
  "items": [{"item_id": "jollof-rice", "quantity": 2}]
}
```

`customer` is required with required `name` and `phone`, and optional `email`. `delivery_address`, `preferred_swallow`, and `notes` are also optional in general. `fulfillment` is exactly `Pickup` or `Delivery`; Delivery requires a non-empty `delivery_address`. Include `preferred_swallow` when any Egusi Soup or Okra Soup is ordered. `items` must contain 1–50 unique menu IDs, each with quantity 1–50. Name, phone, optional email, address, notes, and swallow choice are bounded and validated. Unknown item IDs are rejected. The API calculates prices from its own menu and stores order plus item snapshots atomically.

Success (`201`):

```json
{
  "order_id": "uuid",
  "status": "pending",
  "subtotal_ngn": 9000,
  "delivery_fee_ngn": 0,
  "total_ngn": 9000,
  "whatsapp_url": "https://wa.me/2348157727770?text=..."
}
```

For Pickup, `delivery_fee_ngn` is `0` and total equals the subtotal. For Delivery, `delivery_fee_ngn` and `total_ngn` are both `null` because the fee has not been configured or confirmed. The WhatsApp message includes the order ID, items, subtotal, customer and fulfilment details, and an explicit note that payment has not been collected.

### Admin routes

Admin requests must include `x-admin-api-key: <ADMIN_API_KEY>`. Unauthorized callers receive a generic `401`; customer data is never returned before authorization.

* `GET /api/admin/orders?page=1&limit=20&status=pending&fulfillment=Pickup` — page starts at 1, limit defaults to 20 and is capped at 100. Status and fulfillment filters are optional. Response includes `page`, `limit`, `total`, and `orders`. Each order has `id`, `customer_name`, `customer_phone`, `customer_email`, `fulfillment`, `delivery_address`, `preferred_swallow`, `notes`, `status`, `subtotal_ngn`, `created_at`, and `items`. Each item has `item_id`, `item_name`, `quantity`, `unit_price_ngn`, and computed `line_total_ngn`.
* `PATCH /api/admin/orders/{order_id}/status` with `{"status":"confirmed"}` — supported statuses: `pending`, `confirmed`, `preparing`, `ready`, `completed`, `cancelled`. Returns order ID and new status; unknown IDs return `404`.

Run tests with `rustup run stable cargo test`.

## Docker

Build and run with a persistent SQLite volume and explicit secrets:

```powershell
docker build -t marvels-kitchen-api .
docker run --rm -p 8080:8080 -e ADMIN_API_KEY="use-a-secret" -v mk-data:/data marvels-kitchen-api
```
