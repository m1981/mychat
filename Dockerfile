FROM node:alpine as base

RUN yarn config set prefix /home/appuser/.yarn && \
  yarn global add serve

RUN ls -al /home/appuser/

WORKDIR /home/appuser/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .

FROM base as production
RUN yarn build
#
EXPOSE 3000
CMD ["/home/appuser/.yarn/bin/serve", "-s", "dist", "-l", "3000"]
