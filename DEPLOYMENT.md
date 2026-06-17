# Deployment Guide

This guide walks through deploying the application on free-tier hosting
providers and publishing Docker images to Docker Hub.

The recommended split is:

| Component | Host                    | Why                            |
|-----------|-------------------------|--------------------------------|
| Database  | **Railway Postgres**    | One-click managed PostgreSQL   |
| Backend   | **Railway Web Service** | Native Docker, auto-deploy     |
| Frontend  | **Vercel**              | Best free hosting for SPAs     |

A pre-baked `railway.json` and `vercel.json` are checked in so each
platform can build the right folder with no manual configuration.

---

## 1. Provision the database on Railway

1. Sign in at https://railway.app.
2. **New Project → Provision Postgres**. Wait for it to finish booting.
3. Click the Postgres service → **Variables** → copy **`DATABASE_URL`**.
   It will look like:
   ```
   postgresql://postgres:<PASSWORD>@<host>.proxy.rlwy.net:<PORT>/railway
   ```
4. The schema and a small set of seed rows are created automatically
   by the backend the first time it starts (see
   `backend/app/db/bootstrap.py`). No manual SQL step is required.

---

## 2. Publish Docker images to Docker Hub (optional)

Railway will build from your repo directly, so this is only needed if
you want a downloadable image for sharing or self-hosting.

```bash
docker login

# Backend image
docker build -t <your-dockerhub-user>/ims-backend:1.0.0 ./backend
docker push <your-dockerhub-user>/ims-backend:1.0.0

# Frontend image (optional — Vercel builds from source directly)
docker build -t <your-dockerhub-user>/ims-frontend:1.0.0 ./frontend \
  --build-arg REACT_APP_API_URL=https://<your-railway-service>.up.railway.app
docker push <your-dockerhub-user>/ims-frontend:1.0.0
```

Record the image URL for the submission:

- Backend: `https://hub.docker.com/r/<your-dockerhub-user>/ims-backend`

---

## 3. Deploy the backend (Railway)

1. Push this repo to GitHub.
2. In the same Railway project → **+ New → GitHub Repo** → pick your repo.
3. Railway will detect `railway.json` automatically. If not, set:
   - **Root directory:** `backend`
   - **Dockerfile path:** `backend/Dockerfile`
4. **Variables** on the backend service:
   ```
   DATABASE_URL  = (paste the one from step 1, or use the reference ${{Postgres.DATABASE_URL}})
   USE_PGBOUNCER = false
   CORS_ORIGINS  = https://<your-vercel-app>.vercel.app
   DEBUG         = false
   ```
   Tip: in Railway you can use the reference `${{Postgres.DATABASE_URL}}`
   instead of copy-pasting — it auto-wires the two services.
5. **Settings → Networking → Generate Domain.** Copy the resulting URL,
   e.g. `https://ims-backend-production.up.railway.app`.
6. Wait for the first deploy to finish. Then:
   ```bash
   curl https://ims-backend-production.up.railway.app/
   ```
   should return `{"name":"Inventory & Order Management API",...,"status":"ok"}`.
   And:
   ```bash
   curl https://ims-backend-production.up.railway.app/api/v1/orders/dashboard/summary
   ```
   should return `{"total_products":5,"total_customers":3,...}` — proof
   that the bootstrap ran successfully on the Railway database.

> If you prefer to deploy from a Docker Hub image instead of building on
> Railway, change the **Runtime** to "Docker" and reference
> `<your-dockerhub-user>/ims-backend:1.0.0`.

---

## 4. Deploy the frontend (Vercel)

1. Sign in at https://vercel.com and **Add New → Project**.
2. Import the same GitHub repo.
3. Vercel reads `vercel.json` automatically. If not, configure manually:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Output directory:** `build`
4. **Environment variable:**
   ```
   REACT_APP_API_URL = https://ims-backend-production.up.railway.app
   ```
5. Click **Deploy**. Vercel gives you a `https://<project>.vercel.app` URL.
6. **Go back to step 3** and set `CORS_ORIGINS` on the Railway backend
   service to your Vercel URL, then redeploy the backend. This is
   required — without it the browser blocks the cross-origin API call.
7. Visit the Vercel URL — the app loads and reads data from your
   Railway backend. If the wrong backend is configured, open
   **⚙ API settings** in the sidebar and paste a new URL.

---

## 5. Verify everything

Open the Vercel URL:

- ✅ Dashboard shows counts (5 products, 3 customers, 0 orders, $0.00).
- ✅ Add a product — appears in the list, on the dashboard, and in the
  Railway **Data → Query** tab (`select * from products;`).
- ✅ Add a customer — appears in the customers list.
- ✅ Create an order — total is calculated, stock drops, order appears
  in `/orders`. Try to over-order a product and you should get a clear
  error.
- ✅ Delete the order — stock is restored.

---

## 6. Submission checklist

- [ ] GitHub repo containing `frontend/` and `backend/`
- [ ] Docker Hub image for the backend (`<user>/ims-backend`)
- [ ] Railway Postgres project provisioned
- [ ] Live backend URL (Railway) — include `/docs` for reviewer convenience
- [ ] Live frontend URL (Vercel)
- [ ] `CORS_ORIGINS` set to the Vercel URL (not `*`)
