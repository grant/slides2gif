# Use Node.js 24 LTS
FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source files
COPY . .

# Build Next.js app
RUN npm run build

# Expose port (Cloud Run uses PORT env var, but Next.js defaults to 3000)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["npm", "start"]
