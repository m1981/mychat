FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Add package caching layer
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch --prod

USER node

CMD ["pnpm", "dev:host"]
