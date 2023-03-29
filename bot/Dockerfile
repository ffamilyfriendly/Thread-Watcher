# Multi-stage build and app-only image
FROM node:18-slim as builder

# Create the bot's directory
RUN mkdir -p /usr/src/bot

# Set working directory
WORKDIR /usr/src/bot

# Copy only the package/tsconfig files and the src dir
COPY ["package.json", "package-lock.json*", "tsconfig.json", "/usr/src/bot/"]
COPY ["./src/", "/usr/src/bot/src/"]

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Install only the necessary packages for build
RUN npm ci --only=production && npm cache clean --force && npm install -g typescript

# Run the build command which creates the production bundle
RUN npm run build

COPY . /usr/src/bot

# Create app-only image without including the toolchain 
FROM node:18-slim as bot

# Copy built node modules and binaries without including the toolchain
COPY --from=builder /usr/src/bot .

# Don't run container as root
# USER node

# Start the bot (and register slash commands).
CMD node ./dist/index.js -reg_commands