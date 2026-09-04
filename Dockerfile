# Stage 1: Build the React / Vite frontend
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build (Vite defaults baseUrl to /api for relative API requests)
COPY . .
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy built static files to Nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx template to auto-substitute variables ($PORT, $VITE_API_PROXY_TARGET) at runtime
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy script to auto-load .env file if mounted from GCP Secret Manager
COPY 10-load-env.sh /docker-entrypoint.d/10-load-env.sh
RUN chmod +x /docker-entrypoint.d/10-load-env.sh

# Default environment variables (can be overridden by GCP Cloud Run / Secrets)
ENV PORT=8080
ENV VITE_API_PROXY_TARGET=http://127.0.0.1:8001

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
