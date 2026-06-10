# Polka

Polka is a local marketplace for discovering products from nearby stores and contacting sellers directly. The product is focused on local commerce in Almaty: buyers browse nearby offers, stores manage their public storefronts, and admins moderate partner applications.

The project includes a buyer-facing app, a business dashboard, an admin moderation area, Telegram Mini App authentication, geospatial offer discovery, and media uploads through Supabase Storage.

## Features

- Buyer catalog with nearby offers, search, favorites, store pages, and product details.
- Public store pages with contact links, map links, store details, and active offers.
- Business dashboard for store registration, profile editing, offer management, logo uploads, and product images.
- Admin panel for partner approval, rejection, suspension, review notes, and subscription management.
- Telegram Mini App authentication and webhook handling.
- Phone/password web authentication with Telegram account linking.
- PostGIS-powered geospatial search for nearby offers.
- Supabase Storage integration for partner logos and offer images.
- Docker setups for local development and production deployment.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, SWR, Zustand, Tailwind CSS |
| Backend | FastAPI, SQLModel, SQLAlchemy async, Pydantic, PyJWT |
| Database | PostgreSQL 17 with PostGIS |
| Migrations | Alembic |
| Media Storage | Supabase Storage |
| Infrastructure | Docker Compose, Caddy |
| Checks | Pytest, GitHub Actions, ESLint, TypeScript |

## Project Structure

```text
.
├── backend/                  # FastAPI API, models, services, tests, migrations
│   ├── app/
│   │   ├── routers/          # Auth, offers, orders, partners, admin, Telegram routes
│   │   ├── services/         # Notifications and media storage
│   │   ├── models.py         # SQLModel entities and enums
│   │   ├── schemas.py        # API schemas and DTOs
│   │   └── seed.py           # Demo data for local development
│   ├── migrations/           # Alembic migrations
│   └── tests/                # Backend test suite
├── frontend/                 # Next.js app
│   ├── app/                  # App Router pages for buyer, business, admin, and auth flows
│   ├── components/           # Shared UI and business components
│   ├── hooks/                # Auth and route guards
│   ├── lib/                  # API clients, types, constants, helpers
│   └── store/                # Zustand stores
├── scripts/                  # Operational helper scripts
├── docker-compose.dev.yml    # Local development stack
├── docker-compose.yml        # Production-oriented stack
└── Caddyfile                 # Reverse proxy configuration
```

## Quick Start

Requirements:

- Docker and Docker Compose
- npm only if you want to run frontend commands outside Docker

Create a local environment file:

```bash
cp .env.example .env
```

Start the development stack:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Available services:

- Frontend: http://localhost:3000
- Swagger/OpenAPI: http://localhost:8000/docs
- Backend health check: http://localhost:8000/health
- pgAdmin: http://localhost:5050

The backend container automatically applies Alembic migrations before starting Uvicorn.

## Demo Data

After the database is running and migrations are applied, seed local demo users, a partner profile, offers, and a demo order:

```bash
docker compose -f docker-compose.dev.yml exec backend python -m app.seed
```

Demo accounts:

| Role | Phone | Password |
| --- | --- | --- |
| Buyer | `+77001234567` | `password123` |
| Partner | `+77007654321` | `password123` |

## Local Development Without the Full Docker Stack

You can run only PostGIS in Docker and start the backend and frontend directly on your machine.

Start PostGIS:

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

By default, the frontend proxies `/api/*` to `http://127.0.0.1:8000`. Set `BACKEND_URL` if you need a different backend target.

## Environment Variables

Use `.env.example` as the local template. Never commit real secrets.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Async PostgreSQL connection string used by FastAPI and Alembic |
| `JWT_SECRET`, `JWT_ALGORITHM` | JWT signing configuration |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for Mini App auth and webhook handling |
| `TELEGRAM_WEBAPP_URL` | Public URL of the Telegram Web App |
| `TELEGRAM_WEBHOOK_SECRET` | Secret checked on incoming Telegram webhook requests |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key used for storage uploads |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name, defaults to `media` |
| `SUPABASE_STORAGE_PUBLIC_BASE_URL` | Optional public base URL for stored media |
| `MEDIA_MAX_UPLOAD_BYTES` | Upload size limit, defaults to 5 MB |
| `ADMIN_PHONE_ALLOWLIST` | Comma-separated phones that receive admin rights on login/registration/linking |
| `ADMIN_TG_ID_ALLOWLIST` | Comma-separated Telegram IDs that receive admin rights on login/registration/linking |
| `ADMIN_TELEGRAM_BOT_TOKEN` | Optional bot token for admin notifications |
| `ADMIN_TELEGRAM_CHAT_ID` | Optional chat ID for admin notifications |
| `ADMIN_TELEGRAM_THREAD_ID` | Optional topic/thread ID for admin notifications |
| `ADMIN_PANEL_URL` | Optional admin panel URL included in notifications |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `CORS_ORIGIN_REGEX` | Optional regex for temporary origins such as ngrok |
| `POLKA_DEV_AUTO_CREATE_PARTNER` | Dev-only shortcut for local partner testing |
| `POLKA_DEV_ALLOW_PARTNER_ROLE_BYPASS` | Dev-only shortcut for partner route testing |

In production mode, the backend validates required secrets at startup and rejects unsafe defaults.

## Main API Areas

- `POST /auth/web/register` and `POST /auth/web/login` for web accounts.
- `POST /auth/telegram` for Telegram Mini App authentication.
- `GET /offers/nearby` for location-based catalog results.
- `GET /offers/{offer_id}` for product details.
- `/partner-api/*` for partner profile, offers, media, and order-code verification.
- `/admin/*` for partner moderation and subscription administration.
- `POST /telegram/webhook` for Telegram updates.

The full generated OpenAPI schema is available locally at `/docs`.

## Checks

Backend:

```bash
cd backend
pytest
python -m compileall app
```

Frontend:

```bash
cd frontend
npm run build
npx tsc --noEmit --pretty false
npm run lint -- --quiet
```

The same checks run in GitHub Actions on pushes and pull requests to `main`.

## Telegram Webhook Helper

The helper script reads `.env` and can inspect or set the bot webhook:

```bash
./scripts/telegram-webhook.sh info
./scripts/telegram-webhook.sh set
```

Set `WEBHOOK_URL` if the default production URL is not correct for the current environment.

## Production Deployment

The production Compose file builds dedicated backend and frontend images, runs migrations before the backend starts, and can optionally expose the app through Caddy:

```bash
docker compose up --build -d
docker compose --profile caddy up --build -d
```

Production requires `DATABASE_URL`, Supabase credentials, Telegram settings, a strong `JWT_SECRET`, `CORS_ORIGINS`, and, when using Caddy, `CADDY_SITE_ADDRESS`.

## Development Notes

- Use npm for frontend dependencies; the project has `package-lock.json`.
- Keep database schema changes in Alembic migrations.
- Do not commit `.env`, real tokens, service keys, or other secrets.
- Keep media uploads within the configured `MEDIA_MAX_UPLOAD_BYTES` limit.
- Most UI copy is currently Russian-language because the product targets local users.
