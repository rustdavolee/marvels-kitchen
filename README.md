# Marvel’s Kitchen

This project now includes a modern full-stack application alongside the
original standalone website:

- `web/` — Next.js App Router frontend using React and Tailwind CSS 4.
- `api/` — Rust API with SQLite persistence for orders and an authenticated
  staff order-management API.
- Root `index.html`, `style.css`, and `script.js` — the original static
  GitHub Pages site, preserved for continuity.

## Run the full-stack application

See [`web/README.md`](./web/README.md) for the frontend instructions and API
contract. Start the Rust API first, then start the Next.js app. The frontend
loads the menu and prices from the API, saves checked-out orders in SQLite,
and offers the customer a link to send their saved order to Marvel’s Kitchen
on WhatsApp.

The admin page is `/admin`. It requires the API key configured on the backend
and lets staff review saved order details and update their status. Store
`ADMIN_API_KEY` only in the backend environment; never put it in a `NEXT_PUBLIC_`
variable or commit a real secret.

## Important business settings

- The call number is `08119000048`.
- The WhatsApp number displayed and used by the full-stack site comes from the
  single `WHATSAPP_NUMBER` constant near the top of
  [`api/src/lib.rs`](./api/src/lib.rs); it is currently `2348157727770`
  (`08157727770` in local format).
- The address remains an editable placeholder.
- Menu items and prices are sample data until confirmed by the business.
- Food photographs are illustrative downloaded images, not photos of Marvel’s
  Kitchen meals. Replace them with genuine business photography before launch.
- Soup orders include one complimentary swallow of the customer’s choice.
- The order flow does not take payment. Delivery availability and any fee must
  be confirmed by the kitchen.
- When the Rust API is offline, checkout offers a preview-only test flow; it
  does not save orders, and any WhatsApp message is labelled as a test. It is
  not a substitute for the live ordering API.
- The review form opens an email for the customer to review and send. No
  customer reviews are displayed or fabricated.

## Deployment

The existing GitHub Pages deployment is the static root-level site. It cannot
run the Next.js server or Rust API. Deploy `web/` and `api/` to hosting that
supports long-running Node.js and Rust services, configure HTTPS and API CORS,
set backend secrets in the hosting environment, and attach persistent storage
for the SQLite database before moving the public domain.

Do not use the sample catalog or sample prices for live customer orders until
they have been replaced with business-approved menu data.
