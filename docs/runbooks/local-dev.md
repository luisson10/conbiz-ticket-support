# Runbook: Local Development

## Requisitos

- Node 20+
- npm
- Variables en `.env.local`

## Variables minimas

```bash
LINEAR_API_KEY=lin_api_...
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
INITIAL_ADMIN_EMAIL=admin@conbiz.local
INITIAL_ADMIN_PASSWORD=change-me-strong
```

Opcional:

```bash
LINEAR_WEBHOOK_SECRET=lin_wh_...
LINEAR_FILE_URL_EXPIRES_IN=300
```

## Comandos

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run lint
npm run build
npm run dev
```

## Rutas utiles

- `http://localhost:3000/portal`
- `http://localhost:3000/portal/settings`
- `http://localhost:3000/admin/linear-explorer`
- `http://localhost:3000/admin/users`

## Troubleshooting rapido

- **Error Prisma client**
  - correr `npx prisma generate`
- **Port ocupado**
  - Next cambia a `3001` automaticamente
- **No carga Linear**
  - validar `LINEAR_API_KEY`
  - revisar permisos del token
- **Actividad no aparece**
  - confirmar que comentarios en Linear incluyen `#sync`
