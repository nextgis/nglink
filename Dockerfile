FROM oven/bun:1 AS builder
WORKDIR /app


COPY package.json bun.lock ./
COPY bunfig.toml tsconfig.json ./
COPY common/ common/
COPY front/ front/
COPY server/ server/

RUN bun install

WORKDIR /app/front
RUN bun run prod


FROM oven/bun:1-slim


RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/front/dist ./front/dist

COPY --from=builder /app/server ./server

WORKDIR /app/server
RUN bun install --production

EXPOSE 3000
CMD ["bun", "src/server.ts"]
