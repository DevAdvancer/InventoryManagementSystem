"""FastAPI application entry point.

Wires up routers under the /api/v1 prefix and bootstraps the schema on
startup (see ``app.db.bootstrap``). The bootstrap is idempotent: it is a
no-op on a database that already has the tables and seed data, and a
full setup on a brand-new one.

CORS notes:
* In local dev the frontend nginx proxies ``/api`` to the backend, so the
  browser sees a same-origin request and CORS never fires. We still set
  permissive CORS as a fallback for anyone who hits the backend directly
  from another host (e.g. a deployed frontend on Vercel).
* FastAPI's ``CORSMiddleware`` handles OPTIONS preflights automatically —
  do **not** add a catch-all ``@app.options`` route or it will shadow the
  real route handlers and return 405 on every other method.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, DBAPIError
from sqlalchemy.orm.exc import DetachedInstanceError

from app.core.config import settings
from app.db.bootstrap import initialize_database
from app.routers import customers, orders, products

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # First-run schema + seed. Idempotent — safe on every restart.
    initialize_database()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ----- DB error handler -----------------------------------------------
    # Convert raw SQLAlchemy connection errors (DNS failure, bad password,
    # network timeout, missing table, etc.) into a clean 503 with a
    # human-readable message — instead of a 500 with a stack trace.
    @app.exception_handler(OperationalError)
    @app.exception_handler(DBAPIError)
    async def db_error_handler(request: Request, exc: Exception):
        logger.error("Database error on %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "Database is currently unavailable. "
                    "Check that DATABASE_URL is correct and the database server "
                    "is reachable. The backend creates the schema automatically "
                    "on startup — no manual migration step is required."
                )
            },
        )

    @app.exception_handler(DetachedInstanceError)
    async def detached_instance_handler(request: Request, exc: Exception):
        logger.error("Detached instance on %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error while reading data from the database."},
        )

    # ----- HSTS + HTTPS enforcement --------------------------------------
    # Railway / Render / Vercel all terminate TLS at their edge proxies,
    # so by the time a request reaches uvicorn it's already http. We
    # still want the browser to lock in HTTPS for future navigations,
    # and we want any stray http:// request to be promoted to https://.
    @app.middleware("http")
    async def hsts_and_https_redirect(request, call_next):
        # X-Forwarded-Proto is set by Railway/Vercel/Cloudflare when the
        # original client hit https://. If the edge didn't terminate
        # TLS and we received a plain http request, bounce it.
        if request.url.scheme == "http" and request.headers.get(
            "x-forwarded-proto", "https"
        ) != "https":
            from starlette.responses import RedirectResponse

            https_url = str(request.url).replace("http://", "https://", 1)
            return RedirectResponse(url=https_url, status_code=301)
        response = await call_next(request)
        # Tell the browser to refuse any future plain-http connection
        # for the next year. Cheap, and makes the URL bar show the
        # green/padlock indicator reliably on subsequent visits.
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
        return response

    # ----- CORS middleware -----------------------------------------------
    # Wildcard origin + credentials is rejected by browsers, so when
    # CORS_ORIGINS=* we use a small middleware to echo the request origin
    # back (still effectively "any origin" but compatible with credentials).
    if settings.CORS_ORIGINS == "*":
        @app.middleware("http")
        async def permissive_cors(request, call_next):
            response = await call_next(request)
            origin = request.headers.get("origin")
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Headers"] = (
                    request.headers.get(
                        "access-control-request-headers", "Content-Type,Authorization"
                    )
                )
                response.headers["Access-Control-Allow-Methods"] = (
                    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
                )
                response.headers["Vary"] = "Origin"
            return response

        # CORSMiddleware with allow_origins=["*"] and allow_credentials=False
        # produces a perfectly fine CORS implementation for direct hits.
        # Preflight OPTIONS is answered automatically.
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.get("/", tags=["Health"])
    def health() -> dict:
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "ok",
        }

    # Dedicated, dependency-free health endpoint for orchestrators
    # (Railway, Render, Kubernetes liveness/readiness probes). Returns 200
    # as soon as uvicorn is accepting connections, with no DB call — so a
    # transient DB hiccup never causes the healthcheck to flap.
    @app.get("/health", tags=["Health"])
    def liveness() -> dict:
        return {"status": "ok"}

    api_prefix = settings.API_V1_PREFIX
    app.include_router(products.router, prefix=api_prefix)
    app.include_router(customers.router, prefix=api_prefix)
    app.include_router(orders.router, prefix=api_prefix)
    logger.info("API ready. Schema and seed are managed by app.db.bootstrap.")
    return app


app = create_app()