# Marvel’s Kitchen frontend

Responsive Next.js App Router frontend styled with Tailwind CSS 4. The menu and
order prices come from the Rust API; checkout saves an order before offering its
WhatsApp link. No payment is taken on this site.

## Run locally

1. Install Node.js 22 or newer and npm, plus the Rust stable toolchain. Windows
   Rust builds also need the Visual C++ Build Tools (Desktop development with
   C++) so `link.exe` is available.
2. In a PowerShell terminal from the repository root, configure and start the
   API (see [`api/README.md`](../api/README.md) for all settings):

   ```powershell
   Set-Location .\api
   Copy-Item .env.example .env
   # Set a private ADMIN_API_KEY in .env before exposing the API.
   rustup run stable cargo run
   ```

3. In a second terminal from the repository root, start the frontend:

   ```powershell
   Set-Location .\web
   Copy-Item .env.example .env.local
   npm install
   npm run dev
   ```

4. Open <http://localhost:3000>. The private staff order page is at
   <http://localhost:3000/admin>.

The admin page asks for the server-side `ADMIN_API_KEY` each time. Do not put
the admin key into a `NEXT_PUBLIC_` variable or commit it.

If the API is offline, the storefront lets you test the sample menu, basket,
and checkout. Preview checkouts are not stored; the optional WhatsApp message
is conspicuously marked as a test and warns the kitchen not to fulfil it.
Customers must not use this fallback as a real order channel.

## Mobile, tablet, and desktop

The layout uses mobile-first Tailwind breakpoints, scrollable menu category
controls on narrow screens, a responsive menu/gallery grid, and a full-height
scrollable checkout panel with safe-area spacing for phones.

## Production

Set `NEXT_PUBLIC_API_URL` to the public HTTPS address of the Rust API when
building the frontend. Configure that API's CORS allowlist to include the
frontend origin. Build with `npm run build` and serve with `npm start`.

The current root-level `index.html` remains the earlier static GitHub Pages
version. GitHub Pages cannot host the Rust API or Next.js server; deploy the new
frontend and API to server-capable hosting before switching the public domain.

The supplied logo, local food photographs, and image fallback are in
`public/assets/`. The food photographs are illustrative Unsplash images, not
Marvel’s Kitchen product photography; replace them with approved business
photos before launch.
