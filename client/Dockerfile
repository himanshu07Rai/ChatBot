FROM node:20 AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build

# --- Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["npm", "start"]