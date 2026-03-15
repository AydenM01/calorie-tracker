#!/bin/sh

# Create superuser on first boot if env vars are set
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  /pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" || echo "Warning: superuser upsert failed (may be fine on first run)"
  echo "Admin account ready."
fi

echo "Starting PocketBase on port ${PORT:-8090}..."
exec /pb/pocketbase serve --http="0.0.0.0:${PORT:-8090}"
