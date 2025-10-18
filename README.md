# AvantArt — Avant-garde artist platform

AvantArt is a bilingual (RU/EN) artist platform built with React and Vite. The project combines a rich catalogue, e-commerce flow, admin tooling, and real-time chat to help collectors discover avant-garde works and communicate directly with the studio. A lightweight Express API powers orders and catalogue management, while Firebase Authentication and Firestore handle users and messaging.

## Features

- **Internationalisation** — every UI string is translated through i18next with complete English and Russian resource files.
- **Dynamic SEO metadata** — each route injects translated `<title>`, descriptions, OpenGraph/Twitter cards, canonical URLs, and favicons via the shared `Seo` helper.
- **Robust forms** — registration, login, cart checkout, and chat inputs validate on blur/submit and surface Firebase/API errors in the active locale.
- **Admin workspace** — studio staff can manage artworks, monitor orders, and respond to collector chats with realtime Firestore updates.
- **Augmented reality view** — the `/ar-view/:id` route prepares AR assets with clear diagnostics when required files are missing.
- **Modern theming** — persistent dark/light theme toggle backed by Tailwind CSS utility classes.

## Project structure

```
├── public/              # Static assets (favicon, OpenGraph cover, AR samples)
├── src/
│   ├── components/      # UI building blocks (Navbar, Seo, Work cards, admin tools)
│   ├── context/         # Auth, cart, and theme providers
│   ├── i18n/            # Localisation setup and resource bundles
│   ├── pages/           # Route-level views (catalogue, admin, auth, AR viewer)
│   ├── services/        # API client, Firebase initialisation
│   └── utils/           # Normalisers and helpers
├── server/              # Express API (orders, works) with Mongoose models
└── vite.config.js       # Vite configuration
```

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB instance (local or Atlas)
- Firebase project with Email/Password auth enabled

### Installation

```bash
npm install
```

### Environment variables

Create a `.env` file in the project root (values prefixed with `VITE_` are exposed to the Vite client):

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | ✅ | Base URL of the Express API (e.g. `https://api.example.com`). Used by the client when calling `/api/*` endpoints. |
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase Web API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain (e.g. `your-app.firebaseapp.com`). |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID. |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket (optional but recommended). |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase messaging sender ID. |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase app ID. |
| `MONGODB_URI` | ✅ | MongoDB connection string for the Express API. |
| `PORT` | ❌ | API port (defaults to `4000`). |
| `CLIENT_ORIGIN` | ❌ | Comma-separated list of origins allowed by CORS (e.g. `http://localhost:5173,https://avantart.example`). |

> Tip: store sensitive values (Firebase secrets, Mongo credentials) securely in your hosting provider’s secret manager. Never commit them to Git.

## Running locally

Run the Express API and the Vite client in parallel:

```bash
# Terminal 1 — API server (http://localhost:4000 by default)
npm run server

# Terminal 2 — Vite dev server (http://localhost:5173 by default)
npm run dev
```

The client proxies API calls through `VITE_API_BASE_URL`. When running locally without a proxy, leave `VITE_API_BASE_URL` unset to fall back to `http://localhost:4000/api`.

### Linting

```bash
npm run lint
```

### Production build

```bash
npm run build       # Generates static assets in dist/
npm run preview     # Serves the production build locally
```

## Deployment

### Front-end (Vercel, Netlify, static hosting)

1. Set all `VITE_*` environment variables in the hosting dashboard.
2. Run the default build command: `npm run build`.
3. Serve the `dist/` directory as static assets. On Vercel/Netlify no additional configuration is required; the generated HTML includes canonical SEO tags, OpenGraph data, and the favicon (`public/favicon.ico`).
4. Configure redirects (if needed) to route SPA paths back to `index.html` (Vercel/Netlify handle this automatically).

### API (Vercel functions, Railway, VPS)

1. Provision a Node.js environment (e.g. Railway, Render, Fly.io, or your own VPS).
2. Provide the server environment variables (`MONGODB_URI`, `CLIENT_ORIGIN`, `PORT`).
3. Install dependencies and start the server with `node server/index.js` (or configure a process manager like PM2).
4. Expose HTTPS and update `VITE_API_BASE_URL` in the client deployment to point at the public API URL.

### Server-side headers & redirects

- Ensure your hosting platform sends caching headers for static assets (`dist/assets/*`).
- If deploying behind a reverse proxy, forward `X-Forwarded-Proto` to maintain accurate canonical URLs.
- Configure a 404 fallback to `index.html` for SPA routing.

## Notable implementation details

- The `Seo` component centralises metadata updates (title, description, keywords, canonical URL, OpenGraph/Twitter tags) and ensures they are translated with `react-i18next`.
- Forms surface validation issues inline and map Firebase/Auth/Mongo errors to locale-aware messages.
- Chat and admin dashboards rely on Firestore subscriptions; any networking errors display translated helper messages to keep operators informed.
- Accessibility helpers include translated ARIA labels for navigation and buttons, and `document.documentElement.lang` syncs to the active locale.

## Scripts reference

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot module reloading. |
| `npm run build` | Produce a production build of the React client. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint across the project. |
| `npm run server` | Launch the Express API (reads environment variables from `.env`). |

---

For deployment questions or future enhancements (payments, analytics, AR expansion), refer to the `docs/` directory or the project brief in `agent.md`.
