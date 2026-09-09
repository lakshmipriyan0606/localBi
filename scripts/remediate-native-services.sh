#!/bin/bash
set -euo pipefail

echo "=== Backing up native WSL configurations ==="
cp -f /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.bak.$(date +%s)
cp -f /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.bak.$(date +%s)
cp -f /etc/redis/redis.conf /etc/redis/redis.conf.bak.$(date +%s)

echo "=== Restoring PostgreSQL to localhost only ==="
sed -i "s/listen_addresses = '\*'/listen_addresses = 'localhost'/g" /etc/postgresql/16/main/postgresql.conf

echo "=== Removing broad pg_hba rules ==="
sed -i '/host all all 0.0.0.0\/0 scram-sha-256/d' /etc/postgresql/16/main/pg_hba.conf
sed -i '/host all all all scram-sha-256/d' /etc/postgresql/16/main/pg_hba.conf

echo "=== Restoring Redis loopback and protected mode ==="
sed -i 's/^bind 0.0.0.0/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sed -i 's/^protected-mode no/protected-mode yes/' /etc/redis/redis.conf

echo "=== Ensuring native WSL services are stopped and disabled ==="
systemctl stop postgresql redis-server 2>/dev/null || true
systemctl disable postgresql redis-server 2>/dev/null || true

echo "=== Checking native configuration files ==="
echo "--- postgresql.conf listen_addresses ---"
grep -E 'listen_addresses' /etc/postgresql/16/main/postgresql.conf
echo "--- pg_hba.conf active host rules ---"
grep -E '^host' /etc/postgresql/16/main/pg_hba.conf
echo "--- redis.conf bind & protected-mode ---"
grep -E '^bind|^protected-mode' /etc/redis/redis.conf

echo "=== Checking socket status on 5432 and 6379 ==="
ss -tulpn | grep -E ':5432|:6379' || echo "PORTS 5432 AND 6379 ARE NOT LISTENING ON ANY INTERFACE"
