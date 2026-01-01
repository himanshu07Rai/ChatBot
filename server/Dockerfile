FROM node:20 AS builder

WORKDIR /app

# Copy dependency files
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

# Build the app (outputs to .output/)
RUN npm run build --verbose

# --- Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

EXPOSE 8000

CMD ["npm", "start"]