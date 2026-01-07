# Design Notes - PriceWaze

> Documentaci贸n de arquitectura y dise帽o siguiendo metodolog铆a Edward Honour

## Product Summary

**PriceWaze** (comercializado como "PriceMap") es una plataforma de inteligencia inmobiliaria que proporciona:
- An谩lisis de precios potenciado por AI
- Recomendaciones de ofertas basadas en datos de mercado
- Asistencia en negociaci贸n con estrategias personalizadas
- Generaci贸n de contratos con validaci贸n legal

La plataforma est谩 dise帽ada para ser **market-agnostic** y escalable a cualquier regi贸n geogr谩fica.

### Propuesta de Valor 脷nica (UVP)
> "Toma decisiones inmobiliarias informadas con AI que analiza el mercado real, no estimaciones gen茅ricas"

## Target Users

| Segmento | Descripci贸n | Necesidades Principales |
|----------|-------------|------------------------|
| **Compradores** | Individuos buscando propiedades | Precios justos, negociaci贸n efectiva |
| **Vendedores** | Propietarios listando inmuebles | Pricing 贸ptimo, ofertas competitivas |
| **Agentes** | Profesionales inmobiliarios | Herramientas de an谩lisis, eficiencia |

### Geographies
- **MVP**: Rep煤blica Dominicana
- **Expansi贸n**: Latam, USA Hispanic markets

## Architecture Pattern

### Monolith First
```
鈹屸攢鈹 Next.js App (Monolito)
鈹   鈹溾攢鈹 Frontend (React 19)
鈹   鈹斺攢鈹 API Routes (Serverless)
鈹溾攢鈹 Supabase (BaaS)
鈹   鈹溾攢鈹 PostgreSQL + PostGIS
鈹   鈹溾攢鈹 Auth
鈹   鈹斺攢鈹 Storage
鈹斺攢鈹 CrewAI (Microservice futuro)
    鈹斺攢鈹 Python Workers
```

### Route Structure
```
src/app/
鈹溾攢鈹 (auth)/           # Login/Register (redirect si autenticado)
鈹   鈹溾攢鈹 login/
鈹   鈹斺攢鈹 register/
鈹溾攢鈹 (dashboard)/      # Rutas protegidas con sidebar
鈹   鈹溾攢鈹 properties/
鈹   鈹溾攢鈹 offers/
鈹   鈹溾攢鈹 visits/
鈹   鈹溾攢鈹 favorites/
鈹   鈹斺攢鈹 settings/
鈹溾攢鈹 landing/          # Marketing p煤blico
鈹溾攢鈹 onboarding/       # Flujo de onboarding
鈹斺攢鈹 api/              # API endpoints
    鈹溾攢鈹 properties/
    鈹溾攢鈹 offers/
    鈹溾攢鈹 visits/
    鈹溾攢鈹 ai/           # DeepSeek endpoints
    鈹斺攢鈹 crewai/       # CrewAI bridge
```

## UI/UX Guidelines

### Design System
- **Base**: Shadcn/ui (Radix primitives)
- **Theme**: Dark mode default con toggle
- **Icons**: Lucide React
- **Motion**: Framer Motion (subtle, purposeful)

### Color Palette
```css
/* Primary - Trust & Technology */
--primary: 221.2 83.2% 53.3%;      /* Blue */
--primary-foreground: 210 40% 98%;

/* Semantic */
--success: 142.1 76.2% 36.3%;      /* Green - Good deals */
--warning: 45 93.4% 47.5%;         /* Yellow - Caution */
--destructive: 0 84.2% 60.2%;      /* Red - Overpriced */

/* Surfaces */
--background: 222.2 84% 4.9%;      /* Dark */
--card: 222.2 84% 8%;
```

### Typography
```css
/* Font Stack */
font-family: 'Geist', system-ui, sans-serif;

/* Scale */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
```

### Component Patterns

#### Cards
```tsx
<Card className="hover:border-primary/50 transition-colors">
  <CardHeader>
    <CardTitle>Property Title</CardTitle>
    <CardDescription>Zone 路 Type</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

#### Pricing Indicators
```tsx
// Fairness Score Visual
<Badge variant={score > 80 ? 'success' : score > 60 ? 'warning' : 'destructive'}>
  {score}% Fair Price
</Badge>
```

#### Map Integration
```tsx
<Map
  initialViewState={{ longitude: -69.9, latitude: 18.5, zoom: 10 }}
  mapStyle="mapbox://styles/mapbox/dark-v11"
>
  <Markers properties={properties} />
  <ZoneBoundaries zones={zones} />
</Map>
```

## Key Screens

### 1. Landing Page
- Hero con value prop
- Features grid
- Social proof (testimonials)
- CTA a registro

### 2. Dashboard (Properties)
- Mapa interactivo (主)
- Lista/Grid toggle
- Filtros (precio, zona, tipo)
- Quick actions

### 3. Property Detail
- Gallery/Carousel
- Price analysis widget
- Offer history
- Visit scheduling
- AI recommendations

### 4. Offer Flow
- Step wizard
- AI suggestions inline
- Counter-offer calculator
- Contract preview

### 5. Visits Management
- Calendar view
- GPS verification UI
- Status tracking

## Data Flow

```
User Action
    鈹
    v
React Component
    鈹
    v
Zustand Store / React Query
    鈹
    v
API Route (/api/*)
    鈹
    鈹溾攢鈹 Simple operations 鈫 Supabase direct
    鈹
    鈹斺攢鈹 AI operations 鈫 DeepSeek / CrewAI
              鈹
              v
         Supabase (persist results)
```

## State Architecture

### Zustand Stores
```typescript
// auth-store: Sesi贸n y autenticaci贸n
{ user, session, loading, signIn, signOut }

// property-store: Datos de propiedades (persistido)
{ favorites, recentlyViewed, addFavorite, removeFavorite }

// ui-store: Estado de UI
{ sidebarOpen, isMobile, setSidebarOpen }

// onboarding-store: Progreso de onboarding
{ step, completed, preferences, setStep }
```

## Responsive Breakpoints

```css
/* Tailwind defaults */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Mobile-First Approach
- Sidebar colapsable en mobile
- Mapa full-width en mobile
- Bottom sheet para acciones

## Technical Debt Notes

| 脕rea | Issue | Prioridad |
|------|-------|-----------|
| Localizaci贸n | Hardcoded market references | Alta |
| i18n | No implementado | Media |
| Testing | Cobertura m铆nima | Alta |
| Performance | No lazy loading de rutas | Media |
| SEO | Metadata b谩sica | Baja |
