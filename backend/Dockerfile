# Stage 1: Build & Generate Prisma Client
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
# Install ALL dependencies including devDependencies (like prisma CLI)
RUN npm ci

COPY . .

# Generate Prisma Client pointing to the new prisma/schema.prisma
RUN npx prisma generate

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy generated Prisma Client from builder
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy application source files
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["node", "src/index.js"]
