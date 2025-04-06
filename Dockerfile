FROM node:22-alpine
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
RUN pnpm fetch

CMD ["pnpm", "dev:host"]
