@echo off
REM SAPC-ONAC — Switch entre providers de Prisma (Windows)
REM
REM Uso (desde la raiz del repo):
REM   scripts\switch-db.bat postgres   → activa PostgreSQL (dev con docker + prod^)
REM   scripts\switch-db.bat sqlite     → activa SQLite (sandbox sin docker^)
REM
REM El archivo schema.prisma es el activo; los .postgres.prisma y .sqlite.prisma son plantillas.

setlocal

set SCHEMA_DIR=apps\web\prisma
set TARGET=%SCHEMA_DIR%\schema.prisma

if "%~1"=="postgres" goto :postgres
if "%~1"=="sqlite" goto :sqlite
goto :usage

:postgres
set SRC=%SCHEMA_DIR%\schema.postgres.prisma
if not exist "%SRC%" (
  echo X No existe %SRC% — crea la plantilla primero con:
  echo   copy %TARGET% %SRC%
  echo   # luego edita el provider a 'postgresql'
  exit /b 1
)
copy /Y "%SRC%" "%TARGET%" >nul
echo ✓ Schema Prisma switch a PostgreSQL
echo   DATABASE_URL=postgresql://sapc:pwd@host:5432/sapc_onac
exit /b 0

:sqlite
set SRC=%SCHEMA_DIR%\schema.sqlite.prisma
if not exist "%SRC%" (
  echo X No existe %SRC% — crea la plantilla primero con:
  echo   copy %TARGET% %SRC%
  echo   # luego edita el provider a 'sqlite'
  exit /b 1
)
copy /Y "%SRC%" "%TARGET%" >nul
echo ✓ Schema Prisma switch a SQLite (sandbox^)
echo   DATABASE_URL=file:./dev.db
exit /b 0

:usage
echo Uso: %0 {postgres^|sqlite}
exit /b 1
