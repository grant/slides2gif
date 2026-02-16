# Use Node.js 24 LTS
FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (devDependencies needed for build)
RUN npm ci --include=dev && npm cache clean --force

# Copy source files
COPY . .

# Build Next.js app (NODE_ENV=production for correct build behavior)
# Generate OpenAPI types first (fetchClient.ts depends on lib/api/generated/openapi.d.ts)
ENV NODE_ENV=production
RUN npm run openapi:types && npm run build

# Expose port (Cloud Run uses PORT env var, but Next.js defaults to 3000)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["npm", "start"]
