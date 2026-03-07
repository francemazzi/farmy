# ============================================
# Farmy Backend - Optimized for Raspberry Pi
# ============================================
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only (production)
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma@6.19.2 generate

# Build stage
FROM base AS build
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Production stage - minimal image
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache sqlite

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

RUN mkdir -p uploads data

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=7771
ENV DATABASE_URL="file:/app/data/farmy.db"

EXPOSE 7771

CMD ["sh", "-c", "npx prisma@6.19.2 db push --skip-generate && node dist/index.js"]
