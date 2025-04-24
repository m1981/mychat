# Change from alpine to debian-based image for better compatibility
FROM node:22-slim

# Install build essentials, Python, and debugging tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    procps \
    curl \
    net-tools \
    netcat-traditional \
    lsof \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Enable IPv4 for localhost
RUN echo "net.ipv6.bindv6only=0" >> /etc/sysctl.conf

ARG USER_ID=501
ARG GROUP_ID=501

# Update user/group handling for consistency
RUN groupmod -g ${GROUP_ID} node && \
    usermod -u ${USER_ID} -g ${GROUP_ID} node

# Create all necessary directories with correct permissions
RUN mkdir -p \
    /home/node/.cache/node/corepack \
    /home/node/.local/share/pnpm \
    /home/node/.local/share/pnpm/store/v10 \
    /home/node/.cache/pnpm \
    /app/node_modules/.pnpm \
    && chown -R node:node /home/node /app \
    && chmod -R 755 /home/node/.local \
    && chmod -R 755 /home/node/.cache \
    && chmod 2775 /app/node_modules # SetGID bit for group inheritance

# Enable PNPM (as root for global install)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create and set ownership of PNPM directories and app directory with proper permissions
RUN mkdir -p /home/node/.local/share/pnpm/store /home/node/.cache/pnpm /app/node_modules && \
    chown -R node:node /home/node/.local /home/node/.cache /app && \
    chmod -R 777 /app/node_modules

# Copy package files
COPY --chown=node:node package.json pnpm-lock.yaml ./

# Switch to non-root user for security
USER node

# Configure PNPM
ENV PNPM_HOME=/home/node/.local/share/pnpm \
    PATH=/home/node/.local/share/pnpm:$PATH \
    PNPM_STORE_DIR=/home/node/.local/share/pnpm/store \
    PNPM_CACHE_DIR=/home/node/.cache/pnpm

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

