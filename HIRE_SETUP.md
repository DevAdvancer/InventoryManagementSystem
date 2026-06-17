# Onboarding — backend container

The backend image lives at `devadvancer/inventorymanagementsystem:latest`
on Docker Hub. The image runs FastAPI + uvicorn on port 8000.

## One-time setup

```bash
docker pull devadvancer/inventorymanagementsystem:latest
```

## Local dev (with the bundled Postgres via docker compose)

From the repo root:

```bash
docker compose up -d --build
```

This brings up `ims_backend` (port 8000) and `ims_frontend` (port 8080).

## Standalone backend (against your own Postgres)

```bash
docker run -d --name ims-backend -p 8000:8000 \
  -e PORT=8000 \
  -e DATABASE_URL='postgresql://USER:PASS@HOST:5432/ims' \
  -e CORS_ORIGINS='*' \
  devadvancer/inventorymanagementsystem:latest
```

Health check:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

## Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `8000` | uvicorn binds `0.0.0.0:$PORT` |
| `DATABASE_URL` | yes | — | Postgres connection string |
| `CORS_ORIGINS` | no | `*` | comma-separated allow-list, or `*` |
| `USE_PGBOUNCER` | no | `false` | skip citext creation if you're behind pgbouncer |

## Schema

Schema and seed data are managed by `app.db.bootstrap` — the container
creates tables (`customers`, `products`, `orders`, `order_items`),
triggers, and seed rows on first start.

## Notes for code review

- `backend/entrypoint.sh` resolves `$PORT` so Railway's auto-injected
  port works.
- `backend/app/main.py` adds `Strict-Transport-Security` and a
  https:// redirect middleware so the deployed API is HSTS-locked.
- `frontend/src/utils/runtimeConfig.js` auto-upgrades any `http://`
  API URL to `https://` so mixed-content blocks can't happen on
  the deployed (HTTPS) frontend.
