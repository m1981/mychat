FROM node:22-alpine

ARG USER_ID=501
ARG GROUP_ID=501

# Proper order for user/group handling
RUN deluser --remove-home node \
    && if getent group node ; then delgroup node ; fi \
    && if getent group ${GROUP_ID} ; then delgroup $(getent group ${GROUP_ID} | cut -d: -f1) ; fi \
    && addgroup -g ${GROUP_ID} node \
    && adduser -u ${USER_ID} -G node -s /bin/sh -D node

# Create all necessary directories with correct permissions
RUN mkdir -p /home/node/.cache/node/corepack \
    && mkdir -p /home/node/.local/share/pnpm \
    && mkdir -p /home/node/.local/share/pnpm/store/v10 \
    && mkdir -p /home/node/.cache/pnpm \
    && mkdir -p /app/node_modules \
    && chown -R ${USER_ID}:${GROUP_ID} /home/node \
    && chown -R ${USER_ID}:${GROUP_ID} /app \
    && chmod -R 755 /home/node/.local \
    && chmod -R 755 /home/node/.cache \
    && chmod -R 777 /app/node_modules  # Ensure node_modules is writable

# Enable PNPM (as root for global install)
USER root
RUN corepack enable && corepack prepare pnpm@latest --activate
USER node

WORKDIR /app

# Configure PNPM
ENV PNPM_HOME=/home/node/.local/share/pnpm \
    PATH=/home/node/.local/share/pnpm:$PATH \
    PNPM_STORE_DIR=/home/node/.local/share/pnpm/store \
    PNPM_CACHE_DIR=/home/node/.cache/pnpm

# Copy package files
COPY --chown=node:node package.json pnpm-lock.yaml* ./

# Install dependencies with cache
RUN --mount=type=cache,target=/home/node/.local/share/pnpm/store,uid=${USER_ID},gid=${GROUP_ID} \
    --mount=type=cache,target=/home/node/.cache/pnpm,uid=${USER_ID},gid=${GROUP_ID} \
    pnpm install --frozen-lockfile && \
    pnpm add -g vitest  # Install vitest globally

CMD ["sh"]