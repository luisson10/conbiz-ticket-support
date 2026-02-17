# Documentacion Operativa

Este directorio reemplaza la documentacion monolitica con guias cortas y accionables.

## Indice

- `docs/architecture-overview.md`
  - Arquitectura de alto nivel, responsabilidades por capa y flujo principal.
- `docs/runbooks/local-dev.md`
  - Setup local, comandos y troubleshooting rapido.
- `docs/runbooks/linear-sync.md`
  - Integracion con Linear (API key, comentarios `#sync`, webhooks).
- `docs/adr/ADR-001-portal-architecture.md`
  - Decisiones tecnicas estructurales vigentes.

## Convencion

- Mantener cada documento enfocado en una sola responsabilidad.
- Evitar duplicar informacion entre archivos.
- Si una decision cambia, actualizar ADR + runbook impactado en el mismo PR.
