# Conbiz Ticket Support Platform

Portal de tickets sincronizado con Linear, con modo de soporte y modo de proyecto.

## Stack

- Next.js 16 (App Router + Server Actions)
- React 19 + Tailwind CSS v4
- Prisma 7 + PostgreSQL
- Linear SDK (GraphQL)

## Setup rapido

1. Crear `.env.local`:

```bash
LINEAR_API_KEY=lin_api_...
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
INITIAL_ADMIN_EMAIL=admin@conbiz.local
INITIAL_ADMIN_PASSWORD=change-me-strong
LINEAR_WEBHOOK_SECRET=lin_wh_...
```

2. Instalar dependencias:

```bash
npm install
npm run db:generate
```

3. Verificar calidad:

```bash
npm run db:migrate:deploy
npm run lint
npm run build
```

4. Ejecutar:

```bash
npm run dev
```

## Rutas principales

- `/portal`
- `/portal/settings`
- `/admin/linear-explorer`
- `/admin/users`

## Documentacion

- `docs/README.md`
- `docs/architecture-overview.md`
- `docs/runbooks/local-dev.md`
- `docs/runbooks/deploy-railway.md`
- `docs/runbooks/linear-sync.md`
- `docs/adr/ADR-001-portal-architecture.md`
