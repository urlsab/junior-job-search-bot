# Use official Node.js image
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the application
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Run the bot
CMD ["npm", "start"]