FROM node:20 AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Accept env at build time
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# --- Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["npm", "start"]