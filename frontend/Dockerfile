FROM node:18-slim AS install

WORKDIR /usr/app

COPY ./package*.json ./
COPY ./postcss.config.js ./
COPY ./tailwind.config.js ./
COPY ./tsconfig.json ./
COPY ./assets ./assets
COPY ./contracts ./contracts
COPY ./src ./src

RUN npm ci

### DEV
FROM node:18-slim AS development

WORKDIR /usr/app

COPY --from=install /usr/app/ ./
COPY ./webpack.*.dev.js ./

ENV PATH /usr/app/node_modules/.bin:$PATH

EXPOSE 8080

### PROD
FROM node:18-slim AS production

WORKDIR /usr/app

COPY --from=install /usr/app/ ./
COPY ./webpack.*.prod.js ./

ENV PATH /usr/app/node_modules/.bin:$PATH

EXPOSE 80