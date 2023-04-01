# Multi-stage build and app-only image

# Create base image with toolchain required to install dependencies
FROM node:18-slim as builder
RUN apt-get update

# Create the bot's directory
# RUN mkdir -p /usr/src/bot

# Set working directory
WORKDIR /usr/src/bot

# Copy only the package/tsconfig files and the src dir
COPY ["package.json", "package-lock.json*", "tsconfig.json", "/usr/src/bot/"]

# Install only the necessary packages for build
RUN npm ci --only=production && npm cache clean --force

# Copy source code to build
COPY ["./src/", "/usr/src/bot/src/"]

# Run the build command which creates the production bundle
RUN npm run build



# Create production image without including the toolchain 
FROM gcr.io/distroless/nodejs18-debian11:nonroot as bot

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Set working directory
WORKDIR /usr/src/bot

# Copy built node modules and binaries without including the source codde or toolchain
COPY --chown=nonroot:nonroot --from=builder /usr/src/bot/node_modules /usr/src/bot/node_modules
COPY --chown=nonroot:nonroot --from=builder /usr/src/bot/dist /usr/src/bot/dist

# Start the bot.
CMD [ "./dist/index.js" ]