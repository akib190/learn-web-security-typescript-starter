FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
RUN mkdir -p data/uploads && mkdir -p data/bulk-tax-documents && mkdir -p data/fixtures && chown -R node:node data
COPY --chown=node:node data/fixtures/mystery-shack-tax-exemption.pdf ./data/fixtures/

USER node
CMD [ "node", "src/main.ts" ]
