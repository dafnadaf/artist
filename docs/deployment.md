# Deployment and Development Guide

This project combines a Vite-powered React frontend with an Express + MongoDB API secured by Firebase Authentication. The steps below outline how to configure the environment, run the project locally, and prepare it for production deployment.

## 1. Prerequisites

- Node.js 20.x and npm 10+
- MongoDB instance (local Docker container or MongoDB Atlas cluster)
- Firebase project with Authentication enabled and a generated service account key for the Admin SDK

## 2. Environment variables

Duplicate `.env.example` into `.env` at the project root and adjust the placeholders to match your infrastructure. The same file is read by Vite (when prefixed with `VITE_`) and the Express API via `dotenv/config`.

```bash
cp .env.example .env
```

Update the variables as follows:

- `VITE_API_BASE_URL` – base URL of the Express API (without the trailing `/api`).
- `VITE_FIREBASE_*` – client-side Firebase configuration from the Firebase console.
- `PORT` – port used by the Express server.
- `CLIENT_ORIGIN` – comma-separated list of allowed origins for CORS.
- `MONGODB_URI` – Mongo connection string.
- `FIREBASE_*` – credentials from the Firebase service account. Remember to keep line breaks inside the private key escaped with `\n`.

## 3. Running the development servers

Start MongoDB (locally or ensure Atlas is reachable) and then run the API and frontend in separate terminals:

```bash
# Terminal 1 – backend
npm install
npm run server
```

```bash
# Terminal 2 – frontend
npm run dev
```

The frontend is available at `http://localhost:5173` by default, proxying API calls to the server defined by `VITE_API_BASE_URL`.

## 4. Linting and type checks

Use the shared ESLint configuration before committing changes:

```bash
npm run lint
```

## 5. Building for production

1. Ensure the `.env` files are populated with production values.
2. Run `npm run build` to generate the optimized frontend bundle inside `dist/`.
3. Deploy the contents of `dist/` to a static host (Vercel, Netlify, Firebase Hosting, etc.).
4. Deploy the `server/` directory (with its `.env`) to your Node.js hosting provider (Render, Railway, Fly.io, etc.).
5. Configure reverse proxies or environment variables so the frontend points to the deployed API URL.

## 6. Additional recommendations

- Secure the production API with HTTPS and restrict `CLIENT_ORIGIN` to trusted domains.
- Rotate Firebase service-account keys regularly and store them in a secret manager (Vault, AWS Secrets Manager, etc.).
- Monitor application logs and database metrics after deployment to identify performance or security issues early.
