# Dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies stage
FROM base AS deps
WORKDIR /home/appuser/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
WORKDIR /home/appuser/app
COPY --from=deps /home/appuser/app/node_modules ./node_modules
COPY . .

# Production stage
FROM development AS production
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "serve", "-s", "dist", "-l", "3000"]
