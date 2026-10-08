# syntax=docker/dockerfile:1

# ---- Build the static app ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Serve it ----
# The TI-85 ROM is never baked into this image: it's a copyrighted dump.
# docker/fetch-rom-entrypoint.sh runs at container start (via the base
# image's /docker-entrypoint.d/ convention) and sources it at runtime from
# ROM_URL or ROM_PATH -- see that script and the README for details. If
# neither is set, the app falls back to its in-browser upload picker.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/fetch-rom-entrypoint.sh /docker-entrypoint.d/40-fetch-rom.sh
RUN chmod +x /docker-entrypoint.d/40-fetch-rom.sh
EXPOSE 80
