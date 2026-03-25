# syntax=docker/dockerfile:1

# ── Stage 1: install dependencies ──────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
# Build React SPA (outputs to dist/samples/smart-home/client-react)
RUN npx vite build --config samples/smart-home/react/vite.config.ts
# Build Express server with full bundling (outputs to dist/samples/smart-home/server)
RUN npx nx build smart-home-server --configuration=production

# ── Stage 3: production image ───────────────────────────────────────────────────
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy the self-contained server bundle
COPY --from=builder /app/dist/samples/smart-home/server ./

# Copy the React SPA alongside the server bundle so Express can serve it
COPY --from=builder /app/dist/samples/smart-home/client-react ./client-react

EXPOSE 3000

CMD ["node", "main.js"]
