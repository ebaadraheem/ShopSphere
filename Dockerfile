# Use an official Node image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
