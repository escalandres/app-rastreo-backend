FROM ghcr.io/puppeteer/puppeteer:24.2.1

# Definir la ruta correcta de Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalar dependencias necesarias
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libgtk-3-0 \
    libgbm1

WORKDIR /usr/src/app

# Copiar y configurar las dependencias
COPY package*.json ./
RUN npm ci

COPY . .

# Iniciar la aplicación
CMD ["node", "index.js"]