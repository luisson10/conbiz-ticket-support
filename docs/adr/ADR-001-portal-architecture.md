# ADR-001: Portal Architecture Baseline

- Status: Accepted
- Date: 2026-02-16

## Context

El proyecto crecio con cambios iterativos de UI y data flow, generando archivos monoliticos y contratos inconsistentes entre server actions y componentes.

## Decision

1. Estandarizar respuesta de server actions con `ActionResult<T>`.
2. Definir DTOs compartidos en `lib/contracts/portal.ts`.
3. Separar portal en:
   - hooks de estado/datos
   - componentes de presentacion
   - utilidades de dominio (`priority`, `state-order`, markdown seguro)
4. Aplicar restriccion de modelo:
   - `Board` unico por `accountId + type`.
5. Mantener dualidad funcional:
   - board `SUPPORT` (create enabled)
   - board `PROJECT` (read-only create)

## Consecuencias

### Positivas

- Mejor mantenibilidad y onboarding para nuevos agentes/devs.
- Menos riesgo de regresiones por tipado y contratos.
- Escalabilidad mayor para nuevas features por modulo.

### Costos

- Mayor numero de archivos y abstracciones.
- Necesidad de disciplina para mantener contratos y docs sincronizados.
