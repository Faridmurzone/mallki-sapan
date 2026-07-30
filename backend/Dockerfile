# Backend Express + Prisma
FROM node:20-alpine
WORKDIR /app

# Prisma necesita openssl en alpine
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3001

# Aplica el esquema (idempotente) y arranca la API.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/server.js"]
