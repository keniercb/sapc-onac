-- SAPC-ONAC — Inicialización PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SET timezone TO 'America/Havana';
COMMENT ON DATABASE sapc_onac IS 'Sistema de Atención a Pensionados ONAC';
