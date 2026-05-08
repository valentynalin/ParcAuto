# Stage 1: Build the frontend
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --only=production

# Copy built assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# We use tsx to run the server in production if we don't want to compile it separately
# or we can use a simpler approach. Since tsx is in devDeps, we might need it.
# Let's install tsx globally or as production dep.
RUN npm install -g tsx

EXPOSE 3000

# Create data directory for SQLite
RUN mkdir -p /app/data

CMD ["tsx", "server.ts"]
