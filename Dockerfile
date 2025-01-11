# Dockerfile
FROM node:alpine as base

# Dependencies stage - for efficient caching
FROM base as deps
WORKDIR /home/appuser/app
COPY package.json yarn.lock ./
RUN yarn install

# Development stage
FROM base as development
RUN yarn config set prefix /home/appuser/.yarn && \
    yarn global add serve
WORKDIR /home/appuser/app
COPY --from=deps /home/appuser/app/node_modules ./node_modules
COPY . .

# Production stage
FROM development as production
RUN yarn build
EXPOSE 3000
CMD ["/home/appuser/.yarn/bin/serve", "-s", "dist", "-l", "3000"]
