FROM node:22-alpine

ARG USER_ID=501
ARG GROUP_ID=501

# Minimal system packages
RUN apk add --no-cache shadow python3 make g++

# Proper order for user/group handling
RUN deluser --remove-home node \
    && if getent group node ; then delgroup node ; fi \
    && if getent group ${GROUP_ID} ; then delgroup $(getent group ${GROUP_ID} | cut -d: -f1) ; fi \
    && addgroup -g ${GROUP_ID} node \
    && adduser -u ${USER_ID} -G node -s /bin/sh -D node

# Enable PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create and set ownership of node_modules directory
RUN mkdir -p /app/node_modules && chown -R node:node /app

USER node

# Configure PNPM
ENV PNPM_HOME=/home/node/.local/share/pnpm \
    PATH=/home/node/.local/share/pnpm:$PATH

CMD ["sh"]