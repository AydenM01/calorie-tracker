#!/bin/sh

# Create superuser on first boot if env vars are set
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  /pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" 2>/dev/null
  echo "Admin account ready."
fi

exec /pb/pocketbase serve --http=0.0.0.0:${PORT:-8090}
