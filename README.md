# Inventory & Order Management System

A production-ready, fully containerized **Inventory & Order Management** stack
for small businesses. Manage **products**, **customers**, and **orders** through
a clean React UI backed by a FastAPI service and a **Railway-hosted
PostgreSQL** database.

![Stack](https://img.shields.io/badge/stack-React%20%7C%20FastAPI%20%7C%20PostgreSQL%20%7C%20Docker-blue)

---

## ✨ Features

### Product management
- Create / list / update / delete products
- Unique SKU enforcement
- Stock-level tracking with per-product low-stock thresholds
- Server-side validation (no negative quantities)

### Customer management
- Create / list / delete customers
- Unique email enforcement
- Email validation (Pydantic `EmailStr`)

### Order management
- Multi-line orders with auto-calculated totals
- Stock is **atomically deducted** when an order is created
- Insufficient stock is rejected with a clear 400 error
- Deleting an order restores stock

### Dashboard
- Total products, customers, orders, and revenue
- Low-stock alerts

### Cross-cutting
- Fully **Docker** + **Docker Compose** for local dev
- Backend **auto-creates the schema and seeds baseline data** on first
  startup — no manual SQL step required
- CORS configured via env var
- Swagger UI at `/docs`, ReDoc at `/redoc`
- Responsive React UI with toast notifications and form validation
- Runtime API base-URL override (so a deployed SPA can point at any backend)

---

## 🧱 Project structure

```
InventoryManagementSystem/
├── backend/                  # FastAPI service
│   ├── app/
│   │   ├── core/             # Settings/config
│   │   ├── db/               # SQLAlchemy engine + Base + bootstrap
│   │   ├── models/           # ORM models
│   │   ├── routers/          # API endpoints (products, customers, orders)
│   │   ├── schemas/          # Pydantic request/response models
│   │   └── main.py           # FastAPI app factory + lifespan
│   ├── Dockerfile            # Multi-stage, python:3.12-slim
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                 # React (Create React App) UI
│   ├── public/
│   ├── src/
│   │   ├── components/       # Layout, Modal, Toast, DataTable, …
│   │   ├── pages/            # Dashboard, Products, Customers, Orders
│   │   ├── services/         # API client (axios)
│   │   ├── styles/           # global.css
│   │   └── utils/            # helpers
│   ├── Dockerfile            # Multi-stage, node:20-alpine → nginx:alpine
│   ├── nginx.conf            # SPA routing + cache headers
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml        # backend + frontend (DB lives on Railway)
├── .env.example              # local dev credentials
├── DEPLOYMENT.md             # Railway + Vercel deployment
├── railway.json              # Railway build / start config
├── vercel.json               # Vercel build / SPA fallback
└── README.md
```

---

## 🚀 Quick start (Docker + Railway Postgres)

### 1. Provision the database on Railway

1. Sign in at https://railway.app and **New Project → Provision Postgres**.
2. Click the Postgres service → **Variables** → copy the `DATABASE_URL`.
   It looks like:
   ```
   postgresql://postgres:<PASSWORD>@<host>.proxy.rlwy.net:<PORT>/railway
   ```
3. (Optional) Open **Data → Query** and confirm the database is empty.
   The backend will create the schema and seed data on its first run.

### 2. Configure env

```bash
cp .env.example .env
# Edit .env and paste your Railway DATABASE_URL.
```

### 3. Run the stack

```bash
./scripts/start.sh up        # or: make up
```

Direct equivalent:

```bash
docker compose up --build
```

Once the containers are healthy:

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:8080        |
| Backend   | http://localhost:8000        |
| API docs  | http://localhost:8000/docs   |
| Database  | Railway Postgres (cloud)     |

On the first start the backend logs:
```
INFO:app.db.bootstrap:Ensured citext extension
INFO:app.db.bootstrap:Ensured tables: customers, order_items, orders, products
INFO:app.db.bootstrap:Ensured set_updated_at triggers on products/customers/orders
INFO:app.db.bootstrap:Seeded 5 products and 3 customers
```
…so a brand-new database becomes usable in seconds, with no manual SQL.

The frontend's in-app **⚙ API settings** dialog can override the backend
URL without rebuilding — useful when switching between local and deployed
backends.

### Helper script

A wrapper at `scripts/start.sh` (and `scripts/start.ps1` for Windows)
gives you a small set of subcommands:

```bash
./scripts/start.sh up        # build & start the docker compose stack
./scripts/start.sh dev       # uvicorn + npm start (hot reload, no Docker)
./scripts/start.sh logs      # tail container logs
./scripts/start.sh status    # show running services
./scripts/start.sh down      # stop the stack
./scripts/start.sh clean     # stop + remove containers and volumes
./scripts/start.sh help      # show usage
```

`make up`, `make dev`, `make logs`, `make down`, `make clean` are
shortcut aliases for the same commands.

---

## 🧪 Local development (without Docker)

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Point at your Railway Postgres URL (direct, not the pooler).
export DATABASE_URL="postgresql://postgres:<PASSWORD>@<host>.proxy.rlwy.net:<PORT>/railway"
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```

---

## 🐳 Docker images

### Build the production images
```bash
docker build -t <dockerhub-user>/ims-backend:1.0.0 ./backend
docker build -t <dockerhub-user>/ims-frontend:1.0.0 ./frontend
```

### Push to Docker Hub
```bash
docker login
docker push <dockerhub-user>/ims-backend:1.0.0
docker push <dockerhub-user>/ims-frontend:1.0.0
```

---

## ☁️ Deployment

The full step-by-step lives in [DEPLOYMENT.md](DEPLOYMENT.md). Short version:

- **Database → Railway Postgres** (Provision Postgres, copy `DATABASE_URL`).
- **Backend → Railway Web Service** (auto-detected via `railway.json`).
  Set `DATABASE_URL` and `CORS_ORIGINS` in the service's variables.
- **Frontend → Vercel** (auto-detected via `vercel.json`).
  Set `REACT_APP_API_URL` to your Railway service URL.

---

## 🔌 API reference

Base path: `/api/v1`

### Products
| Method | Path                | Body / Query                          | Description                  |
|--------|---------------------|---------------------------------------|------------------------------|
| POST   | `/products`         | `ProductCreate`                       | Create a product             |
| GET    | `/products`         | `?skip=0&limit=100`                   | List products                |
| GET    | `/products/{id}`    | —                                     | Get a product                |
| PUT    | `/products/{id}`    | `ProductUpdate` (partial)             | Update a product             |
| DELETE | `/products/{id}`    | —                                     | Delete a product (204)       |

### Customers
| Method | Path                | Body / Query                          | Description                  |
|--------|---------------------|---------------------------------------|------------------------------|
| POST   | `/customers`        | `CustomerCreate`                      | Create a customer            |
| GET    | `/customers`        | `?skip=0&limit=100`                   | List customers               |
| GET    | `/customers/{id}`   | —                                     | Get a customer               |
| DELETE | `/customers/{id}`   | —                                     | Delete a customer (204)      |

### Orders
| Method | Path                       | Body / Query                       | Description                          |
|--------|----------------------------|------------------------------------|--------------------------------------|
| POST   | `/orders`                  | `OrderCreate`                      | Create order, deduct stock            |
| GET    | `/orders`                  | `?skip=0&limit=100`                | List orders (with items + customer)   |
| GET    | `/orders/{id}`             | —                                  | Get order detail                     |
| DELETE | `/orders/{id}`             | —                                  | Cancel order, restore stock (204)     |
| GET    | `/orders/dashboard/summary`| —                                  | Dashboard counts + low-stock list     |

### Validation rules
- `Product.sku` is unique (DB-level unique index).
- `Customer.email` is unique and validated as an email.
- `Product.quantity_in_stock >= 0`, `Product.price >= 0`.
- Order quantity must be > 0 and ≤ available stock.
- All request bodies are validated by Pydantic; invalid data returns **422** with field-level errors.
- Conflict (e.g. duplicate SKU / email) returns **409**.
- Missing resources return **404**; insufficient stock returns **400**.

---

## 🧪 Smoke test (after `docker compose up`)

```bash
# Create a product
curl -X POST http://localhost:8000/api/v1/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Mechanical keyboard","sku":"KB-001","price":89.99,"quantity_in_stock":20}'

# Create a customer
curl -X POST http://localhost:8000/api/v1/customers \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Jane Doe","email":"jane@example.com","phone":"+1-555-0100"}'

# Create an order (uses IDs returned above)
curl -X POST http://localhost:8000/api/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{"customer_id":1,"items":[{"product_id":1,"quantity":2}]}'

# Dashboard summary
curl http://localhost:8000/api/v1/orders/dashboard/summary
```

---

## 🛠 Tech stack

| Layer        | Technology                                     |
|--------------|------------------------------------------------|
| Frontend     | React 18 (Create React App), React Router, Axios |
| Backend      | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2 |
| Database     | PostgreSQL 15 (hosted on Railway)              |
| Containers   | Docker (multi-stage), Docker Compose           |
| Web server   | Nginx (alpine)                                 |

---

## 📜 License

This project is provided as a technical assessment deliverable. Use freely for
learning and evaluation.
