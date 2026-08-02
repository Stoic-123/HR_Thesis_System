# ── Builder Stage ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Install system deps required to compile canvas + other native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json first for layer caching
COPY package.json ./

# Install dependencies with retry configuration for large packages
RUN npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retries 5 \
 && npm install --onnxruntime-node-install=skip \
 && npm cache clean --force

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Prune devDependencies to keep node_modules lightweight
RUN npm prune --production

# Remove unused platform binaries from onnxruntime-node to save disk space
RUN rm -rf node_modules/onnxruntime-node/bin/napi-v6/win32 \
           node_modules/onnxruntime-node/bin/napi-v6/darwin \
           node_modules/onnxruntime-node/bin/napi-v6/linux/ia32 \
           node_modules/onnxruntime-node/bin/napi-v6/linux/arm \
           node_modules/onnxruntime-node/bin/napi-v6/linux/arm64

# Copy the rest of the source
COPY . .

# ── Runner Stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS runner

# Install only the runtime libraries needed by native modules (like canvas) and mariadb-client
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app ./

# Create upload directories
RUN mkdir -p public/uploads/documents \
             public/uploads/profiles \
             public/uploads/leaves \
             public/uploads/logos

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push && node server.js"]



