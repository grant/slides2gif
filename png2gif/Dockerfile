FROM node:16
ENV NODE_ENV=production
WORKDIR /usr/app

# Install a ton of dependencies needed for image manipulation (canvas)
# https://www.npmjs.com/package/canvas
# https://github.com/Automattic/node-canvas/wiki/Installation%3A-Ubuntu-and-other-Debian-based-systems
ENV PYTHONUNBUFFERED=1
RUN \
  apt-get update && \
  apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config curl ruby python ffmpeg graphicsmagick

# https://github.com/goodspb/pdlib/issues/17
ENV PKG_CONFIG_PATH=/dlib-install/usr/local/lib64/pkgconfig/

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for TypeScript compilation)
RUN npm ci

# Copy source files
COPY src ./src

# Compile TypeScript
RUN npm run compile

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Start the server
CMD ["node", "dist/index.js"]
