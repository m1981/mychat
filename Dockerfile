# Dockerfile
FROM node:22-alpine as base

# Dependencies stage
FROM base as deps
WORKDIR /home/appuser/app
COPY package.json yarn.lock ./
RUN yarn install

# Development stage
FROM base as development
WORKDIR /home/appuser/app
# Copy deps from previous stage
COPY --from=deps /home/appuser/app/node_modules ./node_modules
COPY . .
RUN yarn config set prefix /home/appuser/.yarn && \
    yarn global add serve

# Production stage
FROM development as production
RUN yarn build
EXPOSE 3000
CMD ["/home/appuser/.yarn/bin/serve", "-s", "dist", "-l", "3000"]
