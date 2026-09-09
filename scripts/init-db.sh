#!/bin/sh
set -euo pipefail

# Ensure shell tracing is disabled to protect credentials
set +x

# Validate required variables
if [ -z "${POSTGRES_USER:-}" ]; then
  echo "FATAL: POSTGRES_USER environment variable is required but unset." >&2
  exit 1
fi
if [ -z "${POSTGRES_DB:-}" ]; then
  echo "FATAL: POSTGRES_DB environment variable is required but unset." >&2
  exit 1
fi
if [ -z "${MIGRATOR_PASSWORD:-}" ]; then
  echo "FATAL: MIGRATOR_PASSWORD environment variable is required but unset." >&2
  exit 1
fi
if [ -z "${APP_PASSWORD:-}" ]; then
  echo "FATAL: APP_PASSWORD environment variable is required but unset." >&2
  exit 1
fi

echo "=== Initializing localbi database roles (Three-Role Least-Privilege Model) ==="

# Executed strictly by local bootstrap administrator ($POSTGRES_USER)
# during initial container provisioning.
# Pass passwords and identifiers as psql variables to prevent shell interpolation and SQL injection:
#   :'migrator_pw' -> psql SQL string literal quoting (escapes single quotes, backslashes, etc.)
#   :'app_pw'      -> psql SQL string literal quoting
#   :"db_name"     -> psql SQL identifier quoting
psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v migrator_pw="$MIGRATOR_PASSWORD" \
     -v app_pw="$APP_PASSWORD" \
     -v db_name="$POSTGRES_DB" \
     <<-'EOSQL'
    -- 1. Create Migration Role (Schema Owner, Strictly NOSUPERUSER / NOCREATEDB / NOCREATEROLE)
    CREATE ROLE localbi_migrator WITH
        LOGIN
        PASSWORD :'migrator_pw'
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOREPLICATION
        NOBYPASSRLS;

    -- 2. Create Application Runtime Role (DML Only, Strictly NOSUPERUSER / NOCREATEDB / NOCREATEROLE)
    CREATE ROLE localbi_app WITH
        LOGIN
        PASSWORD :'app_pw'
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOREPLICATION
        NOBYPASSRLS;

    -- 3. Revoke all default privileges from public pseudo-role
    REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
    REVOKE ALL ON SCHEMA public FROM PUBLIC;

    -- 4. Grant connection to localbi database
    GRANT CONNECT ON DATABASE :"db_name" TO localbi_migrator, localbi_app;

    -- 5. Assign schema public ownership to localbi_migrator
    ALTER SCHEMA public OWNER TO localbi_migrator;
    GRANT ALL ON SCHEMA public TO localbi_migrator;

    -- 6. Grant schema usage only to runtime role (cannot execute DDL)
    GRANT USAGE ON SCHEMA public TO localbi_app;

    -- 7. Configure default privileges for future objects created by localbi_migrator
    ALTER DEFAULT PRIVILEGES FOR ROLE localbi_migrator IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO localbi_app;

    ALTER DEFAULT PRIVILEGES FOR ROLE localbi_migrator IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO localbi_app;
EOSQL

echo "=== Localbi database roles initialized successfully (Three-Role Model) ==="
