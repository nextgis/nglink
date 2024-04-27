FROM node:20-alpine as base

# Add package file
COPY package*.json ./

# Install deps
RUN npm i

# Copy source
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Build dist
RUN npm run build


FROM node:20-alpine as front

COPY ./front/package.json ./front/package-lock.json ./
RUN npm i
COPY ./front ./
RUN npm run prod

# Start production image build
FROM gcr.io/distroless/nodejs20-debian12

# Copy node modules and build directory
COPY --from=base ./node_modules ./node_modules
COPY --from=base /dist /dist

# Copy static files
COPY --from=front ./dist ./front/dist

# Expose port 3000
EXPOSE 3000
CMD ["dist/server.js"]
