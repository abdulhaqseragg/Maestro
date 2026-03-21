# =========================================
# Stage 1: Build the React/Vite application
# =========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy all source files
COPY . .

# Build the app (uses .env.production if it exists)
RUN npm run build

# =========================================
# Stage 2: Serve with Nginx
# =========================================
FROM nginx:alpine AS production

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (will be mounted via docker-compose)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
