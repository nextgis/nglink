FROM node:20-alpine as base


COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./tsconfig.json
RUN npm run build


FROM node:20-alpine as front
COPY ./front/package.json ./front/package-lock.json ./
RUN npm ci
COPY ./front ./
COPY ./common ../common
RUN npm run prod

# Start production image build
FROM node:slim


# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Copy node modules and build directory
COPY --from=base ./node_modules ./node_modules
COPY --from=base /dist /dist

# Copy static files
COPY --from=front ./dist ./front/dist


# Expose port 3000
EXPOSE 3000
CMD ["node", "dist/server.js"]
