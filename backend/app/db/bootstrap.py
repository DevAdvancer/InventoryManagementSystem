"""First-run schema bootstrap and seed.

This module is intentionally self-contained: a fresh, empty database
(typical when pointing the app at a brand-new managed Postgres — e.g.
a freshly-provisioned Railway Postgres) is made usable by a single
``docker compose up`` — no manual psql step.

Idempotency:
  * ``Base.metadata.create_all`` is a no-op for tables that already exist.
  * The seed inserts use ``ON CONFLICT DO NOTHING`` and only run when
    both ``products`` and ``customers`` are empty, so a restart on a
    populated database does not duplicate rows.
  * The ``set_updated_at`` trigger uses ``CREATE OR REPLACE`` and
    ``DROP TRIGGER IF EXISTS … CREATE TRIGGER``, so it can be re-run
    without erroring.

The bootstrap runs in its own short-lived session so we don't hold a
transaction open while DDL is in flight.
"""
import logging
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.database import Base, SessionLocal, engine
from app.models import models  # noqa: F401  (registers tables on Base)

logger = logging.getLogger(__name__)


# Trigger function + three triggers that keep `updated_at` fresh on UPDATE.
_TRIGGER_DDL = [
    """
    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at := now();
      return new;
    end
    $$;
    """,
    "drop trigger if exists trg_products_set_updated_at on public.products;",
    """
    create trigger trg_products_set_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();
    """,
    "drop trigger if exists trg_customers_set_updated_at on public.customers;",
    """
    create trigger trg_customers_set_updated_at
    before update on public.customers
    for each row execute function public.set_updated_at();
    """,
    "drop trigger if exists trg_orders_set_updated_at on public.orders;",
    """
    create trigger trg_orders_set_updated_at
    before update on public.orders
    for each row execute function public.set_updated_at();
    """,
]


# Baseline demo data. The backend now owns schema + seed on first startup.
_SEED_PRODUCTS = [
    dict(name="Mechanical keyboard", sku="KB-001",
         description="Hot-swappable, RGB, linear switches", price=Decimal("89.99"),
         quantity_in_stock=25, low_stock_threshold=5),
    dict(name="Wireless mouse", sku="MS-014",
         description="Ergonomic wireless mouse", price=Decimal("29.50"),
         quantity_in_stock=60, low_stock_threshold=10),
    dict(name="USB-C hub", sku="HB-100",
         description="7-in-1 hub with HDMI/Ethernet/SD", price=Decimal("45.00"),
         quantity_in_stock=3, low_stock_threshold=5),
    dict(name="Laptop stand", sku="ST-220",
         description="Aluminium adjustable laptop stand", price=Decimal("34.75"),
         quantity_in_stock=12, low_stock_threshold=4),
    dict(name="Noise-cancel headphones", sku="HP-500",
         description="Over-ear ANC headphones", price=Decimal("199.00"),
         quantity_in_stock=0, low_stock_threshold=3),
]

_SEED_CUSTOMERS = [
    dict(full_name="Jane Doe", email="jane@example.com",
         phone="+1-555-0100", address="221B Baker Street, London"),
    dict(full_name="John Smith", email="john.smith@example.com",
         phone="+1-555-0181", address="500 Market St, San Francisco, CA"),
    dict(full_name="Priya Patel", email="priya@example.com",
         phone="+91-98765-43210", address="12 MG Road, Bengaluru"),
]


def _run_ddl() -> None:
    """Create the citext extension, all tables, and the updated_at triggers."""
    # Extensions first — pgcrypto / citext are referenced by table DDL
    # when the migrations SQL is later used elsewhere.
    with engine.begin() as conn:
        conn.execute(text('create extension if not exists "citext"'))
    logger.info("Ensured citext extension")

    # Tables from the ORM metadata (idempotent).
    Base.metadata.create_all(bind=engine)
    logger.info("Ensured tables: %s", ", ".join(sorted(Base.metadata.tables)))

    # Triggers — must run with a real connection that can DDL out of a tx,
    # but engine.begin() above already covers it; just keep separate commits
    # for clarity.
    with engine.begin() as conn:
        for stmt in _TRIGGER_DDL:
            conn.execute(text(stmt))
    logger.info("Ensured set_updated_at triggers on products/customers/orders")


def _seed_if_empty() -> None:
    """Insert baseline products + customers only if the tables are empty."""
    with SessionLocal() as db:  # type: Session
        products_count = db.execute(
            text("select count(*) from products")
        ).scalar_one()
        customers_count = db.execute(
            text("select count(*) from customers")
        ).scalar_one()

        if products_count > 0 and customers_count > 0:
            logger.info(
                "Skipping seed: %d products, %d customers already present",
                products_count,
                customers_count,
            )
            return

        # ON CONFLICT DO NOTHING keeps the insert idempotent even if one
        # table happens to be empty while the other is not. We provide
        # created_at/updated_at explicitly with now() because raw text()
        # bypasses SQLAlchemy's Python-side default callables.
        for row in _SEED_PRODUCTS:
            db.execute(
                text(
                    """
                    insert into products
                        (name, sku, description, price, quantity_in_stock,
                         low_stock_threshold, created_at, updated_at)
                    values
                        (:name, :sku, :description, :price, :quantity_in_stock,
                         :low_stock_threshold, now(), now())
                    on conflict (sku) do nothing
                    """
                ),
                row,
            )
        for row in _SEED_CUSTOMERS:
            db.execute(
                text(
                    """
                    insert into customers
                        (full_name, email, phone, address,
                         created_at, updated_at)
                    values
                        (:full_name, :email, :phone, :address,
                         now(), now())
                    on conflict (email) do nothing
                    """
                ),
                row,
            )
        db.commit()
        logger.info(
            "Seeded %d products and %d customers",
            len(_SEED_PRODUCTS),
            len(_SEED_CUSTOMERS),
        )


def initialize_database() -> None:
    """Public entry point — safe to call on every startup."""
    try:
        _run_ddl()
        _seed_if_empty()
    except Exception:
        # Re-raise so the startup logs the real error and the
        # OperationalError handler can convert it to 503 on the first
        # request. We intentionally do not swallow this.
        logger.exception("Database bootstrap failed")
        raise
