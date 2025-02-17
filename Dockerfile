# Dockerfile
FROM node:22-alpine as base

# Dependencies stage
FROM base as deps
WORKDIR /home/appuser/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Development stage
FROM base as development
WORKDIR /home/appuser/app
COPY --from=deps /home/appuser/app/node_modules ./node_modules
COPY . .

# Production stage
FROM development as production
RUN yarn build
EXPOSE 3000
CMD ["yarn", "serve", "-s", "dist", "-l", "3000"]
