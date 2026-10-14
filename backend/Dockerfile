# --- Backend y Worker de TaskFlow (misma imagen, distinto comando) ---
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero (aprovecha la caché de capas de Docker)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=3000
ENV IN_DOCKER=1
EXPOSE 3000

USER node
CMD ["node", "src/app.js"]
