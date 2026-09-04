# Stage 1: Build the React / Vite frontend
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Set build argument for backend API URL (e.g. https://backend-xxx-uc.a.run.app/api)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy built static files to Nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx template to auto-substitute $PORT via official Nginx entrypoint
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default port for Cloud Run (Cloud Run sets the PORT env variable dynamically)
ENV PORT=8080

EXPOSE 8080

# Nginx image starts by substituting templates in /etc/nginx/templates/ and running nginx
CMD ["nginx", "-g", "daemon off;"]
