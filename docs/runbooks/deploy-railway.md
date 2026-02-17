# Runbook: Deploy en Railway (PostgreSQL + Prisma)

## 1) Preparar el proyecto

```bash
npm install
npm run db:generate
npm run build
```

## 2) Crear servicios en Railway

- Crear un servicio **PostgreSQL**.
- Crear un servicio de la app (repo GitHub conectado o deploy por CLI).
- Obtener el `DATABASE_URL` de PostgreSQL y asignarlo como variable de entorno en la app.

Variables minimas sugeridas en la app:

```bash
DATABASE_URL=postgresql://...
LINEAR_API_KEY=lin_api_...
LINEAR_WEBHOOK_SECRET=lin_wh_...
CONBIZ_AUTH_BYPASS=false
NODE_ENV=production
RAILPACK_NODE_VERSION=22
```

## 3) Configurar comandos de build/deploy

- Este repo incluye `railway.toml` con:
  - Builder: `RAILPACK`
  - Build command: `npm ci && npm run build`
  - Start command: `npm run db:migrate:deploy && npm run start`

Esto asegura que las migraciones de Prisma se apliquen automaticamente antes de levantar la app.
Si prefieres configurarlo manualmente desde UI de Railway, usa los mismos comandos.

## 4) Primera migracion en Postgres

El proyecto ya incluye un baseline de PostgreSQL en:

- `prisma/migrations/20260217000000_init_postgresql/migration.sql`

En un entorno nuevo de Railway, `prisma migrate deploy` aplicara ese baseline.

## 5) Verificacion post-deploy

- Abrir `/portal` y `/admin/users`.
- Validar que se puedan crear/consultar entidades en la base.
- Confirmar logs limpios de Prisma al arrancar.

## Nota sobre migracion de datos existentes (SQLite -> PostgreSQL)

Este cambio deja la app lista para PostgreSQL, pero **no** copia automaticamente datos historicos desde `dev.db`.
Si necesitas mover datos reales de SQLite a Postgres, hay que ejecutar una migracion de datos aparte (ETL/export-import) antes del go-live.
