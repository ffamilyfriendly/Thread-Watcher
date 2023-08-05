# Multi-stage build and app-only image

# Create base image with toolchain required to install dependencies
FROM node:18-slim as builder
RUN apt-get update

# Create the bot's directory
# RUN mkdir -p /usr/src/bot

# Create the bot's directory
RUN mkdir -p /usr/src/bot/data

# Set working directory
WORKDIR /usr/src/bot

# Copy only the package/tsconfig files and the src dir
COPY ["package.json", "yarn.lock*", "tsconfig.json", "_config.json5", "/usr/src/bot/"]

# Install only the necessary packages for build
RUN yarn install --frozen-lockfile && yarn cache clean --force

# Copy source code to build
COPY ["./src/", "/usr/src/bot/src/"]

# Run the build command which creates the production bundle
RUN yarn run build

# Create production image without including the toolchain 
FROM gcr.io/distroless/nodejs18-debian11:nonroot as bot

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Set working directory
WORKDIR /usr/src/bot

# Copy built node modules and binaries without including the source code or toolchain
COPY --chown=nonroot:nonroot --from=builder /usr/src/bot/node_modules /usr/src/bot/node_modules
COPY --chown=nonroot:nonroot --from=builder /usr/src/bot/dist /usr/src/bot/dist

# Copy config
COPY --chown=nonroot:nonroot --from=builder /usr/src/bot/_config.json5 /usr/src/bot/_config.json5
COPY --chown=nonroot:nonroot --from=builder /usr/src/bot/data /usr/src/bot/data

# Start the bot & register slash commands.
CMD [ "./dist/index.js", "-reg_commands" ]