#!/bin/sh
set -e

# Creates additional databases from POSTGRES_EXTRA_DATABASES (comma-separated).
# The default database (POSTGRES_DB) is created automatically by the official image.
# Example: POSTGRES_EXTRA_DATABASES=games,wallets

if [ -n "$POSTGRES_EXTRA_DATABASES" ]; then
  IFS=','
  for db in $POSTGRES_EXTRA_DATABASES; do
    db=$(echo "$db" | tr -d '[:space:]')
    [ -z "$db" ] && continue
    echo "Creating database: $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
      -v dbname="$db" \
      <<-'EOSQL'
        SELECT format('CREATE DATABASE %I', :'dbname')
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'dbname')\gexec
EOSQL
    echo "Database '$db' created (or already exists)."
  done
fi
