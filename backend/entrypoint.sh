#!/bin/sh
# Container entrypoint — resolves $PORT (Railway / Render inject it) and
# execs uvicorn. Default to 8000 for local docker compose / docker run.
#
# We can't use a JSON-array CMD with --port $PORT: exec form skips shell
# expansion, so uvicorn sees the literal string "$PORT" and dies with
# "'$PORT' is not a valid integer". Using a small wrapper script that
# runs through /bin/sh fixes that without forcing a single CMD style.
#
# --forwarded-allow-ips=* tells uvicorn to honor X-Forwarded-Proto /
# X-Forwarded-For from the edge proxy. Without this, FastAPI's
# redirect_slashes (the default) issues 307 Location headers that point
# to http://... even when the original request was https, which the
# browser then blocks as mixed content.
set -e
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --forwarded-allow-ips="*" \
  --proxy-headers
