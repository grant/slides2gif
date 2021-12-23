# FROM ubuntu:18.04
FROM node:16
ENV NODE_ENV=production
WORKDIR /usr/app

# https://github.com/Automattic/node-canvas/wiki/Installation%3A-Ubuntu-and-other-Debian-based-systems
ENV PYTHONUNBUFFERED=1
RUN \
  apt-get update && \
  apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config curl ruby python ffmpeg graphicsmagick

# pkg-config cairo pango libpng jpeg giflib

COPY ./ /usr/app

# https://github.com/goodspb/pdlib/issues/17
ENV PKG_CONFIG_PATH=/dlib-install/usr/local/lib64/pkgconfig/


COPY package*.json ./
RUN npm i
# RUN npm --build-from-source --unsafe-perm --allow-root i

# Start the server
CMD ["npm", "start"]


# # # Needed for canvas
# # # https://github.com/mapbox/node-pre-gyp/issues/477#issuecomment-534231739
# RUN npm --build-from-source --unsafe-perm --allow-root i
# # COPY . .
# # EXPOSE 3000
# # RUN chown -R node /usr/src/app

# # # Start the server
# # USER node
# # CMD ["npm", "start"]




# # # FROM node:14-alpine3.14
# # # ENV NODE_ENV=production
# # # WORKDIR /usr/src/app

# # # # Install bash & git
# # # RUN apk update && apk add bash git curl

# # # # https://github.com/goodspb/pdlib/issues/17
# # # ENV PKG_CONFIG_PATH=/dlib-install/usr/local/lib64/pkgconfig/

# # # # Install python for canvas
# # # ENV PYTHONUNBUFFERED=1
# # # RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python

# # # # Install system deps (requires python)
# # # RUN apk add ffmpeg graphicsmagick

# # # # Needed for brew
# # # RUN apk add ruby

# # # # Needed for node-gyp
# # # RUN /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
# # # && brew --version
# # # # RUN brew install pkg-config


