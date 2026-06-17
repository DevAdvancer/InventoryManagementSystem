"""Application configuration loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application configuration.

    All values come from environment variables. Override ``DATABASE_URL``
    in production (e.g. with the URL Railway provides for the Postgres
    service). The default below is a local development placeholder.

    Set ``USE_PGBOUNCER=true`` when the URL points at a pgbouncer-style
    transaction pooler so SQLAlchemy uses ``NullPool`` and we never
    exceed the pooler's per-client connection cap.
    """

    # Database — example: postgresql://USER:PASSWORD@HOST:PORT/DBNAME
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/inventory_db"

    # Application
    APP_NAME: str = "Inventory & Order Management API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    CORS_ORIGINS: str = "*"

    # Set to true when DATABASE_URL points at a pgbouncer front-end.
    USE_PGBOUNCER: bool = False

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
