#!/bin/sh
# 1. Load .env file if mounted via GCP Secret Manager volume
for env_file in /secrets/.env /etc/secrets/.env /app/.env /.env; do
  if [ -f "$env_file" ]; then
    echo "Loading environment variables from $env_file"
    export $(grep -v '^#' "$env_file" | xargs)
  fi
done

# 2. Normalize VITE_API_PROXY_TARGET (clean up any trailing slash or /api)
if [ -n "$VITE_API_PROXY_TARGET" ]; then
  # Remove trailing slashes
  TARGET=$(echo "$VITE_API_PROXY_TARGET" | sed 's:/*$::')
  # Remove trailing /api if present
  TARGET=$(echo "$TARGET" | sed 's:/api$::')
  export VITE_API_PROXY_TARGET="$TARGET"
  echo "Configured API proxy target: $VITE_API_PROXY_TARGET/api/"
fi
