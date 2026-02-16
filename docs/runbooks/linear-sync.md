# Runbook: Linear Sync

## Scope

Este runbook cubre sincronizacion entre portal y Linear para:

- Tickets por board
- Comentarios visibles al cliente (`#sync`)
- Actividad reciente
- Adjuntos (proxy de `uploads.linear.app`)

## Flujo de tickets

1. Portal consulta tickets por board (`teamId + projectId opcional`)
2. Server action transforma respuesta a DTO estable
3. UI aplica filtros/sorts por board

## Flujo de comentarios

- Desde portal:
  - `createIssueComment` antepone `#sync` al comentario
- Desde Linear:
  - Solo comentarios con `#sync` se muestran en portal

## Adjuntos e imagenes

- Markdown usa links de `uploads.linear.app`
- UI reescribe URL a `/api/linear/file?url=...`
- API route valida host y proxyea con `LINEAR_API_KEY`

## Webhook (estado actual)

- Endpoint: `/api/webhooks/linear`
- Valida firma `linear-signature` + timestamp
- Actualmente deja base lista para persistencia de eventos

## Checklist de validacion

- [ ] Crear ticket en board de soporte
- [ ] Confirmar ticket visible en portal
- [ ] Agregar comentario con `#sync` en Linear
- [ ] Confirmar comentario visible en portal
- [ ] Confirmar imagen de descripcion se renderiza
