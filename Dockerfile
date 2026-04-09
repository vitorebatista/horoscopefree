# Multi-stage build for horoscopefree — small Alpine-based runtime image.
#
# The builder stage installs ALL dependencies (including devDependencies like
# TypeScript and Vitest), runs `yarn build` to emit `dist/`, and is then
# discarded. The runtime stage pulls in only production dependencies plus the
# already-compiled `dist/` — no TypeScript toolchain ships in the final image.

# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps (prod + dev) so `tsc` is available for the build.
# --ignore-scripts skips the `prepare: tsc` lifecycle hook; we can't run tsc
# yet because tsconfig.json and src/ aren't in the image at this point.
# We build explicitly below after the source is copied in.
COPY package.json yarn.lock ./
RUN corepack enable \
 && yarn install --frozen-lockfile --ignore-scripts

# Copy source and compile.
COPY tsconfig.json ./
COPY src/ ./src/
RUN yarn build

# ---- Runtime ----
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
# Default cache dir — overridden by fly.toml's [env] section in production,
# but set here so `docker run` without Fly still writes somewhere sensible.
ENV HOROSCOPE_CACHE_DIR=/data/horoscopes

# Production dependencies only.
# --ignore-scripts skips the `prepare: tsc` lifecycle hook because we copy
# the pre-built dist/ from the builder stage — no compilation needed here.
COPY package.json yarn.lock ./
RUN corepack enable \
 && yarn install --frozen-lockfile --production --ignore-scripts \
 && yarn cache clean

# Copy compiled output from the builder.
COPY --from=builder /app/dist ./dist

# Create the cache directory so the server can write even before Fly mounts
# a volume (e.g. during `docker run` smoke tests). Fly's volume mount at
# /data will overlay this at runtime.
RUN mkdir -p /data/horoscopes

EXPOSE 8080

# Use absolute path so `process.argv[1]` matches `import.meta.url` exactly
# — this is how `src/server.ts`'s `isMain` check detects it should bootstrap
# the HTTP server vs being imported as a module.
CMD ["node", "/app/dist/server.js"]
