# syntax=docker/dockerfile:1.6

# --- builder stage: install Python deps in a slim venv ---
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build deps for psycopg2-binary's manylinux wheels (none needed for the
# binary wheel, but keep build-essential as a safety net for source fallbacks).
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --prefix=/install --no-cache-dir -r requirements.txt


# --- runtime stage: copy the venv into a tiny final image ---
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/install/bin:${PATH}" \
    PYTHONPATH="/app"

# Runtime-only system deps: libpq is required by psycopg2.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 appuser

WORKDIR /app

COPY --from=builder /install /usr/local
COPY --chown=appuser:appuser app ./app

USER appuser

EXPOSE 8000

# A simple healthcheck that hits our root endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, sys; \
sys.exit(0) if urllib.request.urlopen('http://localhost:8000/', timeout=3).status == 200 else sys.exit(1)"

# Railway (and Render) inject $PORT at runtime. Default to 8000 for local
# docker-compose / docker run usage.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
