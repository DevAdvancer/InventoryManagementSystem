"""Database engine, session factory, and Base class for ORM models.

When ``USE_PGBOUNCER`` is enabled (recommended for any pgbouncer-style
transaction pooler), SQLAlchemy's built-in connection pool is replaced
with ``NullPool`` so every request goes through the pooler and we never
exceed its per-client connection cap.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

_engine_kwargs = {
    "pool_pre_ping": True,
    "future": True,
}
if settings.USE_PGBOUNCER:
    # Each checkout opens a fresh connection, releases immediately.
    _engine_kwargs["poolclass"] = NullPool

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    """Yield a database session and ensure it is closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()