FROM node:20-alpine AS development-dependencies-env
RUN npm install -g npm@11
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS production-dependencies-env
RUN npm install -g npm@11
COPY ./package.json ./package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY ./package.json ./package-lock.json ./server.ts ./tsconfig.json ./tsconfig.node.json /app/
COPY ./lti /app/lti
COPY ./app /app/app
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
CMD ["npm", "run", "start"]
