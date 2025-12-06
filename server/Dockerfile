FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Dummy DATABASE_URL just for Prisma generate at build time (se sobreescribe en runtime)
ENV DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Generate Prisma client
RUN npx prisma generate

# Expose API port
EXPOSE 4000

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
