# Use Debian slim — required for glibc-linked binaries (onnxruntime-node, canvas)
FROM node:20-slim

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
    mariadb-client \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

# Copy package.json first for layer caching
COPY package.json ./

# Install dependencies using standard npm and clean cache to save space
# Skip downloading the massive CUDA GPU binaries since the VPS is CPU-only
RUN npm install --onnxruntime-node-install=skip && npm cache clean --force

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the source
COPY . .

# Create upload directories
RUN mkdir -p public/uploads/documents \
             public/uploads/profiles \
             public/uploads/leaves \
             public/uploads/logos

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push && node server.js"]

