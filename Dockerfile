# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS development-dependencies-env
COPY package.json package-lock.json /app/
WORKDIR /app
RUN npm ci

FROM node:24-alpine AS production-dependencies-env
COPY package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:24-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM node:24-alpine

ARG VERSION=dev
ARG COMMIT=none
ARG BUILD_DATE

LABEL org.opencontainers.image.title="Web" \
      org.opencontainers.image.description="Blueprint AI web app" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}"

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S app && \
    adduser -S app -G app

ENV NODE_ENV=production
WORKDIR /app

COPY --from=production-dependencies-env --chown=app:app /app/node_modules ./node_modules
COPY --from=build-env --chown=app:app /app/build ./build
COPY --chown=app:app package.json tsconfig.json tsconfig.node.json server.ts metrics.ts ./
COPY --chown=app:app lti ./lti
COPY --chown=app:app app ./app

USER app

CMD ["node", "--import", "tsx", "server.ts"]
