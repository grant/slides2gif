# Cloud Run image for png2gif (node-canvas compiles at build time).
FROM node:24-slim AS builder
WORKDIR /usr/app

ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run compile
RUN npm prune --production

FROM node:24-slim
WORKDIR /usr/app

# Runtime libraries required by canvas.node (dev packages stay in builder stage only).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/app/dist ./dist
COPY --from=builder /usr/app/node_modules ./node_modules
COPY --from=builder /usr/app/package.json ./package.json

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
