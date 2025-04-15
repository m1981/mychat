FROM node:22-alpine

ARG USER_ID=1000
ARG GROUP_ID=1000

# Install necessary system packages (grouped for better caching)
RUN apk add --no-cache \
    shadow \
    python3 \
    make \
    g++ \
    su-exec

# Update node user's UID/GID to match host user
RUN deluser node && \
    (getent group ${GROUP_ID} || addgroup -g ${GROUP_ID} node) && \
    adduser -u ${USER_ID} -G $(getent group ${GROUP_ID} | cut -d: -f1) -s /bin/sh -D node

# Enable PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create and set ownership of directories (grouped for better layer caching)
RUN mkdir -p \
    /home/node/.local/share/pnpm/store \
    /home/node/.cache/pnpm \
    /app/node_modules && \
    chown -R node:$(getent group ${GROUP_ID} | cut -d: -f1) \
        /home/node \
        /app

# Copy package files with correct ownership
COPY --chown=node:node package.json pnpm-lock.yaml* ./

# Switch to non-root user
USER node

# Configure PNPM environment (grouped related ENV settings)
ENV PNPM_HOME=/home/node/.local/share/pnpm \
    PATH=/home/node/.local/share/pnpm:$PATH \
    PNPM_STORE_DIR=/home/node/.local/share/pnpm/store \
    PNPM_CACHE_DIR=/home/node/.cache/pnpm \
    ESBUILD_BINARY_PATH=/app/node_modules/esbuild/bin/esbuild

# Set build-time variables
ARG PNPM_FROZEN_LOCKFILE=false
ENV PNPM_FROZEN_LOCKFILE=${PNPM_FROZEN_LOCKFILE}

# Initial install and rebuild platform-specific packages
RUN pnpm install && \
    pnpm rebuild esbuild

# Setup entrypoint
COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sh"]
