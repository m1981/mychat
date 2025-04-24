# Change from alpine to debian-based image for better compatibility
FROM node:22-slim

# Install build essentials and Python (needed for some node modules)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create and set ownership of PNPM directories and app directory
RUN mkdir -p /home/node/.local/share/pnpm/store /home/node/.cache/pnpm && \
    chown -R node:node /home/node/.local /home/node/.cache && \
    chown -R node:node /app

# Copy package files
COPY --chown=node:node package.json pnpm-lock.yaml ./

# Switch to non-root user for security
USER node

# Fetch dependencies (will be installed at runtime)
ARG PNPM_FROZEN_LOCKFILE=false
ENV PNPM_FROZEN_LOCKFILE=${PNPM_FROZEN_LOCKFILE}

# Install dependencies with platform-specific binaries
RUN if [ "$PNPM_FROZEN_LOCKFILE" = "true" ] ; then \
        pnpm install --frozen-lockfile ; \
    else \
        pnpm install ; \
    fi && \
    # Force install platform-specific Rollup
    pnpm rebuild @rollup/rollup-linux-x64-gnu @rollup/rollup-linux-arm64-gnu

CMD ["pnpm", "dev:host"]

