# Use Debian slim — required for glibc-linked binaries (onnxruntime-node, canvas)
FROM oven/bun:1-slim

# Install system deps for canvas + other native modules
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

# Copy lockfile and manifest first for better layer caching
COPY package.json bun.lock ./

RUN bun install

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy the rest of the source
COPY . .

# Create upload directories
RUN mkdir -p public/uploads/documents \
             public/uploads/profiles \
             public/uploads/leaves \
             public/uploads/logos

EXPOSE 8080

CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && bun server.js"]
