FROM node:18-slim AS install

WORKDIR /usr/app

COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./contracts ./contracts
COPY ./src ./src

RUN npm ci && npm run build

### DEV
FROM node:18-slim AS development

WORKDIR /usr/app

COPY --from=install /usr/app/ ./

ENV PATH /usr/app/node_modules/.bin:$PATH

EXPOSE 3000

### PROD
FROM node:18-slim AS production

WORKDIR /usr/app

COPY --from=install /usr/app/ ./

ENV PATH /usr/app/node_modules/.bin:$PATH

EXPOSE 3000