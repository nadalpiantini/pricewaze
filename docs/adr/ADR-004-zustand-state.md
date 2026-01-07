# ADR-004: Zustand para State Management

## Status
**Accepted** - 2025-01-06

## Context
PriceWaze necesita gestionar estado en el cliente para:
- Sesi贸n de usuario y autenticaci贸n
- Propiedades favoritas y vistas recientemente
- Estado de UI (sidebar, mobile detection)
- Progreso de onboarding

## Decision
Usar **Zustand** para state management global, con persistencia selectiva.

## Consequences

### Positivas
- **Simplicidad**: API minimal, sin boilerplate
- **Performance**: Re-renders m铆nimos por dise帽o
- **Bundle size**: ~1KB gzipped
- **TypeScript**: Excelente inferencia de tipos
- **Persistencia**: Middleware `persist` built-in
- **DevTools**: Compatible con Redux DevTools
- **No providers**: Sin Context wrapper hell

### Negativas
- **Menos estructura**: Sin Redux-style patterns forzados
- **Comunidad menor**: Menos recursos que Redux

### Riesgos
- **Overuse**: Poner todo en stores cuando server state es mejor
- **Mitigaci贸n**: Usar TanStack Query para server state, Zustand solo para UI state

## Store Architecture

```typescript
// stores/
鈹溾攢鈹 auth-store.ts      # Usuario, sesi贸n (no persistido - security)
鈹溾攢鈹 property-store.ts  # Favoritos, recientes (persistido)
鈹溾攢鈹 ui-store.ts        # Sidebar, mobile (persistido)
鈹斺攢鈹 onboarding-store.ts # Progreso (persistido)
```

```typescript
// Example: property-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PropertyStore {
  favorites: string[];
  recentlyViewed: string[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  addRecentlyViewed: (id: string) => void;
}

export const usePropertyStore = create<PropertyStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentlyViewed: [],
      addFavorite: (id) => set((state) => ({
        favorites: [...state.favorites, id]
      })),
      removeFavorite: (id) => set((state) => ({
        favorites: state.favorites.filter((f) => f !== id)
      })),
      addRecentlyViewed: (id) => set((state) => ({
        recentlyViewed: [id, ...state.recentlyViewed.filter((r) => r !== id)].slice(0, 10)
      })),
    }),
    { name: 'pricewaze-property-store' }
  )
);
```

## State Categories

| Category | Solution | Persistence |
|----------|----------|-------------|
| UI State | Zustand | LocalStorage |
| User Preferences | Zustand | LocalStorage |
| Auth/Session | Zustand | Memory only |
| Server Data | TanStack Query | Cache |
| Form State | React Hook Form | Memory |

## Alternatives Considered

### 1. Redux Toolkit
- **Pros**: Estable, gran ecosistema, patrones establecidos
- **Cons**: Boilerplate, bundle size (~12KB), overkill para app peque帽a
- **Rejected**: Complejidad no justificada

### 2. Jotai
- **Pros**: Atomic, minimal, TypeScript nativo
- **Cons**: Modelo mental diferente, menos documentaci贸n
- **Rejected**: Zustand m谩s familiar para el equipo

### 3. React Context + useReducer
- **Pros**: Built-in, sin dependencias
- **Cons**: Re-renders excesivos, boilerplate, sin persist
- **Rejected**: Performance y DX inferiores

### 4. Valtio
- **Pros**: Proxy-based, mutaciones directas
- **Cons**: Menos predecible, debugging complejo
- **Rejected**: Zustand m谩s expl铆cito y testeable

## Decision Owner
Frontend Lead

## Date
2025-01-06
