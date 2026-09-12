#!/usr/bin/env bash
# SAPC-ONAC — Switch entre providers de Prisma
#
# Uso (desde la raíz del repo):
#   ./scripts/switch-db.sh postgres   → activa PostgreSQL (dev con docker + prod)
#   ./scripts/switch-db.sh sqlite     → activa SQLite (sandbox sin docker)
#
# El archivo schema.prisma es el activo; los .postgres.prisma y .sqlite.prisma son plantillas.

set -euo pipefail

SCHEMA_DIR="apps/web/prisma"
TARGET="${SCHEMA_DIR}/schema.prisma"

if [ "$1" == "postgres" ]; then
  SRC="${SCHEMA_DIR}/schema.postgres.prisma"
  if [ ! -f "$SRC" ]; then
    echo "✗ No existe $SRC — crea la plantilla primero con:"
    echo "  cp $TARGET $SRC"
    echo "  # luego edita el provider a 'postgresql'"
    exit 1
  fi
  cp "$SRC" "$TARGET"
  echo "✓ Schema Prisma switch a PostgreSQL"
  echo "  DATABASE_URL=postgresql://sapc:pwd@host:5432/sapc_onac"
elif [ "$1" == "sqlite" ]; then
  SRC="${SCHEMA_DIR}/schema.sqlite.prisma"
  if [ ! -f "$SRC" ]; then
    echo "✗ No existe $SRC — crea la plantilla primero con:"
    echo "  cp $TARGET $SRC"
    echo "  # luego edita el provider a 'sqlite'"
    exit 1
  fi
  cp "$SRC" "$TARGET"
  echo "✓ Schema Prisma switch a SQLite (sandbox)"
  echo "  DATABASE_URL=file:./dev.db"
else
  echo "Uso: $0 {postgres|sqlite}"
  exit 1
fi
