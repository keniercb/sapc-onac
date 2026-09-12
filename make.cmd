@echo off
REM SAPC-ONAC — Equivalente de Makefile para Windows
REM Uso:
REM   make.cmd help            — lista todos los comandos
REM   make.cmd dev-up          — levanta stack dev (postgres + redis + api + web)
REM   make.cmd dev-down        — detiene stack dev
REM   make.cmd dev-logs        — sigue logs de api y web
REM   make.cmd dev-psql        — abre psql en postgres de dev
REM   make.cmd dev-redis-cli   — abre redis-cli
REM   make.cmd dev-reset-db    — resetea BD y reseed
REM   make.cmd dev-build       — reconstruye imágenes de dev
REM   make.cmd dev-sh-web      — shell interactivo en contenedor web
REM   make.cmd dev-sh-api      — shell interactivo en contenedor api
REM   make.cmd dev-debug       — levanta con pgadmin (perfil debug)
REM   make.cmd prod-build      — construye imágenes de prod
REM   make.cmd prod-up         — levanta stack de producción
REM   make.cmd prod-down       — detiene stack de producción
REM   make.cmd prod-logs       — sigue logs de prod
REM   make.cmd switch-pg       — cambia schema Prisma a PostgreSQL
REM   make.cmd switch-sqlite   — cambia schema Prisma a SQLite (sandbox)
REM   make.cmd clean           — limpia volúmenes y cachés (cuidado: borra datos)

setlocal EnableDelayedExpansion

set DEV_COMPOSE=infra\docker\docker-compose.dev.yml
set PROD_COMPOSE=infra\docker\docker-compose.yml

REM Comando base docker compose
set DC=docker compose -f %DEV_COMPOSE%
set DCP=docker compose -f %PROD_COMPOSE%

REM Verificar si existe .env
if exist .env (
  set ENV_FLAG=--env-file .env
) else (
  set ENV_FLAG=
)
if exist .env.production (
  set ENV_PROD_FLAG=--env-file .env.production
) else (
  set ENV_PROD_FLAG=
)

if "%~1"=="" goto :help
if "%~1"=="help" goto :help
if "%~1"=="dev-up" goto :dev_up
if "%~1"=="dev-down" goto :dev_down
if "%~1"=="dev-logs" goto :dev_logs
if "%~1"=="dev-build" goto :dev_build
if "%~1"=="dev-reset-db" goto :dev_reset_db
if "%~1"=="dev-psql" goto :dev_psql
if "%~1"=="dev-redis-cli" goto :dev_redis_cli
if "%~1"=="dev-sh-web" goto :dev_sh_web
if "%~1"=="dev-sh-api" goto :dev_sh_api
if "%~1"=="dev-debug" goto :dev_debug
if "%~1"=="prod-build" goto :prod_build
if "%~1"=="prod-up" goto :prod_up
if "%~1"=="prod-down" goto :prod_down
if "%~1"=="prod-logs" goto :prod_logs
if "%~1"=="switch-pg" goto :switch_pg
if "%~1"=="switch-sqlite" goto :switch_sqlite
if "%~1"=="clean" goto :clean
goto :help

:help
echo SAPC-ONAC — Comandos disponibles (Windows)
echo.
echo Desarrollo (docker compose dev^):
echo   make.cmd dev-up        Levanta postgres + redis + api + web (con hot reload^)
echo   make.cmd dev-down      Detiene el stack de desarrollo
echo   make.cmd dev-logs      Sigue logs de api y web
echo   make.cmd dev-psql      Abre psql en el postgres de dev
echo   make.cmd dev-redis-cli Abre redis-cli en redis de dev
echo   make.cmd dev-reset-db  Resetea la BD y reseed
echo   make.cmd dev-build     Reconstruye imagenes de dev
echo   make.cmd dev-sh-web    Shell interactivo en el contenedor web
echo   make.cmd dev-sh-api    Shell interactivo en el contenedor api
echo   make.cmd dev-debug     Levanta con pgadmin (perfil debug^)
echo.
echo Produccion (docker compose prod^):
echo   make.cmd prod-build    Construye imagenes de prod
echo   make.cmd prod-up       Levanta el stack de produccion
echo   make.cmd prod-down     Detiene el stack de produccion
echo   make.cmd prod-logs     Sigue logs de prod
echo.
echo Utilidades:
echo   make.cmd switch-pg     Cambia schema Prisma a PostgreSQL
echo   make.cmd switch-sqlite Cambia schema Prisma a SQLite (sandbox^)
echo   make.cmd clean         Limpia volumenes y caches (cuidado: borra datos^)
goto :eof

:dev_up
%DC% %ENV_FLAG% up -d
echo.
echo ✓ Stack de desarrollo levantado:
echo   - Web:      http://localhost:3000
echo   - API:      http://localhost:4000/health
echo   - Postgres: localhost:5432 (sapc/sapc_dev_pwd^)
echo   - Redis:    localhost:6379
echo.
echo   Ver logs:   make.cmd dev-logs
echo   Detener:    make.cmd dev-down
goto :eof

:dev_down
%DC% %ENV_FLAG% down
goto :eof

:dev_logs
%DC% %ENV_FLAG% logs -f api web
goto :eof

:dev_build
%DC% %ENV_FLAG% build
goto :eof

:dev_reset_db
echo ATENCION: Esto borrara TODA la BD de desarrollo. Continuar? (Ctrl+C para cancelar^)
pause
%DC% %ENV_FLAG% exec api sh -c "cd /app/apps/api && pnpm db:push --force-reset && pnpm db:seed"
echo ✓ BD reseteada y reseed aplicado
goto :eof

:dev_psql
%DC% %ENV_FLAG% exec postgres psql -U sapc -d sapc_onac_dev
goto :eof

:dev_redis_cli
%DC% %ENV_FLAG% exec redis redis-cli
goto :eof

:dev_sh_web
%DC% %ENV_FLAG% exec web sh
goto :eof

:dev_sh_api
%DC% %ENV_FLAG% exec api sh
goto :eof

:dev_debug
%DC% %ENV_FLAG% --profile debug up -d
echo.
echo ✓ Stack de desarrollo + pgadmin:
echo   pgAdmin: http://localhost:5050 (admin@onac.cu / admin^)
goto :eof

:prod_build
%DCP% %ENV_PROD_FLAG% build
goto :eof

:prod_up
%DCP% %ENV_PROD_FLAG% up -d
echo.
echo ✓ Stack de producción levantado:
echo   - Web:      http://localhost:3000
echo   - API:      http://localhost:4000/health
echo   - Postgres: localhost:5432
echo   - Redis:    localhost:6379
goto :eof

:prod_down
%DCP% %ENV_PROD_FLAG% down
goto :eof

:prod_logs
%DCP% %ENV_PROD_FLAG% logs -f
goto :eof

:switch_pg
call scripts\switch-db.bat postgres
goto :eof

:switch_sqlite
call scripts\switch-db.bat sqlite
goto :eof

:clean
echo ATENCION: Esto borrara TODOS los datos de dev (postgres, redis, node_modules^). Continuar? (Ctrl+C para cancelar^)
pause
%DC% %ENV_FLAG% down -v
%DCP% %ENV_PROD_FLAG% down -v
docker system prune -f
echo ✓ Limpieza completada
goto :eof
