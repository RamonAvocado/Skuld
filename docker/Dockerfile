FROM node:22-slim
COPY --from=oven/bun:1.4.2 /usr/local/bin/bun /usr/local/bin/bun
# Skuld commits coverage snapshots with git; sitespeed.io drives Chromium through the
# chromedriver Debian builds for that same version.
RUN apt-get update && apt-get install -y --no-install-recommends git chromium chromium-driver fonts-liberation \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Mount a volume at /data to keep the database across container upgrades.
ENV NODE_ENV=production SKULD_DB=/data/skuld.db PORT=3003
VOLUME /data
EXPOSE 3003
CMD ["bun", "run", "start"]

# Last, so a version bump doesn't invalidate the build cache.
ARG VERSION=dev
LABEL org.opencontainers.image.title="skuld" \
      org.opencontainers.image.version=$VERSION
