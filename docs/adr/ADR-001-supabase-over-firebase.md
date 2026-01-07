# ADR-001: Elecci贸n de Supabase sobre Firebase

## Status
**Accepted** - 2025-01-06

## Context
PriceWaze necesita un backend-as-a-service (BaaS) que provea:
- Base de datos relacional con soporte geoespacial
- Autenticaci贸n de usuarios
- Row Level Security para multi-tenancy
- API autogenerada

## Decision
Usar **Supabase** (PostgreSQL) como backend principal, en el proyecto compartido `sujeto10`.

## Consequences

### Positivas
- **PostGIS nativo**: Queries geoespaciales (`ST_Contains`, `ST_Distance`) sin servicios externos
- **RLS potente**: Pol铆ticas de seguridad a nivel de fila, ideal para multi-tenant
- **SQL puro**: Sin vendor lock-in, migraci贸n f谩cil a cualquier PostgreSQL
- **Realtime**: Subscripciones WebSocket incluidas
- **Open source**: Auto-hosteable si es necesario
- **Ecosystem Next.js**: `@supabase/ssr` con excelente DX

### Negativas
- **Proyecto compartido**: Requiere prefijo `pricewaze_` en todas las tablas
- **Cold starts**: Puede haber latencia inicial en free tier
- **Learning curve**: RLS requiere entendimiento profundo de PostgreSQL

### Riesgos
- **Single point of failure**: Proyecto compartido afecta otros productos
- **Mitigaci贸n**: Monitoreo activo, backup diario, plan de migraci贸n documentado

## Alternatives Considered

### 1. Firebase (Firestore)
- **Pros**: Realtime nativo, ecosistema Google, scaling autom谩tico
- **Cons**: NoSQL no ideal para relaciones complejas, no PostGIS, vendor lock-in severo
- **Rejected**: Queries geoespaciales limitadas, modelo de datos no relacional

### 2. PlanetScale (MySQL)
- **Pros**: Branching de DB, scaling horizontal
- **Cons**: No PostGIS, pricing menos predecible
- **Rejected**: Falta de soporte geoespacial nativo

### 3. Neon (PostgreSQL)
- **Pros**: PostgreSQL serverless, branching
- **Cons**: Sin auth integrado, menos maduro
- **Rejected**: Requiere implementar auth separado

## Decision Owner
Arquitecto de Soluci贸n

## Date
2025-01-06
