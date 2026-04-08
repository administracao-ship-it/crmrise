FROM node:20-slim

# Install Chromium and dependencies for whatsapp-web.js
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer / Chromium env vars
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Copy application source
COPY src ./src

# Ensure persistent data dirs exist
RUN mkdir -p /app/data /app/uploads /app/.wwebjs_auth /app/.wwebjs_cache

EXPOSE 3001

# Run db push (creates/migrates SQLite schema) then start the server
CMD sh -c "npx prisma db push --skip-generate && npm start"
