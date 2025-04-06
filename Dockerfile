# Specify platform explicitly
FROM --platform=linux/amd64 node:22-alpine

# Add required build dependencies
RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create and set ownership of PNPM directories and app directory
RUN mkdir -p /home/node/.local/share/pnpm/store /home/node/.cache/pnpm && \
    chown -R node:node /home/node/.local /home/node/.cache && \
    chown -R node:node /app

# Copy package.json first (pnpm-lock.yaml might not exist initially)
COPY --chown=node:node package.json ./

# Copy pnpm-lock.yaml if it exists
COPY --chown=node:node pnpm-lock.yaml* ./

# Switch to non-root user for security
USER node

# Fetch dependencies (will be installed at runtime)
ARG PNPM_FROZEN_LOCKFILE=false
ENV PNPM_FROZEN_LOCKFILE=${PNPM_FROZEN_LOCKFILE}

# Force platform-specific installation
ENV ESBUILD_BINARY_PATH=/app/node_modules/esbuild/bin/esbuild

# Initial install to generate lock file if it doesn't exist
RUN pnpm install

# Rebuild platform-specific packages
RUN pnpm rebuild esbuild

CMD ["pnpm", "dev:host"]
