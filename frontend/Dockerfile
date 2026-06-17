# syntax=docker/dockerfile:1.6

# --- builder stage: install npm deps and build a production bundle ---
FROM node:20-alpine AS builder

WORKDIR /app

# Cache the dependency layer independently of source changes.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
# CRA reads REACT_APP_* at build time. The .env.production file is optional —
# the React code falls back to REACT_APP_API_URL or the runtime override.
RUN npm run build


# --- runtime stage: serve the static bundle with nginx ---
FROM nginx:1.27-alpine AS runtime

# Replace the default nginx config with one that handles SPA routing and
# caches static assets aggressively.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
