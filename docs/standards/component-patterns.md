# Component Patterns Guide

## Overview

Este documento define los patrones de componentes para PriceWaze, asegurando consistencia y reusabilidad en la UI.

---

## Component Categories

```
src/components/
├── ui/           # Primitivos de UI (shadcn/ui)
├── [domain]/     # Componentes por dominio de negocio
├── layout/       # Layout components
└── shared/       # Componentes compartidos
```

---

## 1. Atomic Design Pattern

### Atoms (Primitivos)

Elementos UI basicos, sin logica de negocio.

```typescript
// src/components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### Molecules (Combinaciones)

Combinacion de atoms con funcionalidad especifica.

```typescript
// src/components/ui/form-field.tsx
interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

### Organisms (Componentes Complejos)

Componentes de dominio con logica de negocio.

```typescript
// src/components/properties/PropertyCard.tsx
interface PropertyCardProps {
  property: Property;
  onFavorite?: (id: string) => void;
  onCompare?: (id: string) => void;
}

export function PropertyCard({ property, onFavorite, onCompare }: PropertyCardProps) {
  const { addFavorite, isFavorite } = usePropertyStore();
  const { addToComparison } = useComparisonStore();

  return (
    <Card data-testid="property-card">
      <PropertyImage src={property.images[0]} />
      <CardContent>
        <PropertyPrice price={property.price} />
        <PropertyDetails property={property} />
        <PropertyActions
          onFavorite={() => onFavorite?.(property.id) || addFavorite(property.id)}
          onCompare={() => onCompare?.(property.id) || addToComparison(property.id)}
          isFavorite={isFavorite(property.id)}
        />
      </CardContent>
    </Card>
  );
}
```

---

## 2. Compound Components Pattern

Para componentes con multiples partes relacionadas.

```typescript
// src/components/offers/OfferCard.tsx
interface OfferCardContextValue {
  offer: Offer;
  isExpanded: boolean;
  toggle: () => void;
}

const OfferCardContext = createContext<OfferCardContextValue | null>(null);

function useOfferCard() {
  const context = useContext(OfferCardContext);
  if (!context) throw new Error('Must be used within OfferCard');
  return context;
}

// Main component
function OfferCard({ offer, children }: { offer: Offer; children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <OfferCardContext.Provider value={{ offer, isExpanded, toggle: () => setIsExpanded(!isExpanded) }}>
      <Card>{children}</Card>
    </OfferCardContext.Provider>
  );
}

// Sub-components
OfferCard.Header = function OfferCardHeader() {
  const { offer, toggle } = useOfferCard();
  return (
    <CardHeader onClick={toggle} className="cursor-pointer">
      <CardTitle>{formatPrice(offer.amount)}</CardTitle>
      <Badge variant={offer.status}>{offer.status}</Badge>
    </CardHeader>
  );
};

OfferCard.Details = function OfferCardDetails() {
  const { offer, isExpanded } = useOfferCard();
  if (!isExpanded) return null;

  return (
    <CardContent>
      <p>From: {offer.buyer_name}</p>
      <p>Message: {offer.message}</p>
      <p>Fairness Score: {offer.fairness_score}</p>
    </CardContent>
  );
};

OfferCard.Actions = function OfferCardActions() {
  const { offer } = useOfferCard();
  return (
    <CardFooter>
      <Button onClick={() => handleAccept(offer.id)}>Accept</Button>
      <Button variant="outline" onClick={() => handleCounter(offer.id)}>Counter</Button>
      <Button variant="destructive" onClick={() => handleReject(offer.id)}>Reject</Button>
    </CardFooter>
  );
};

// Usage
<OfferCard offer={offer}>
  <OfferCard.Header />
  <OfferCard.Details />
  <OfferCard.Actions />
</OfferCard>
```

---

## 3. Custom Hooks Pattern

Extraer logica de componentes a hooks reutilizables.

### Data Fetching Hook

```typescript
// src/hooks/useProperty.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProperty(propertyId: string) {
  return useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => fetchProperty(propertyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOffer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('Offer submitted successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
```

### UI State Hook

```typescript
// src/hooks/useDisclosure.ts
import { useState, useCallback } from 'react';

interface UseDisclosureReturn {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
}

export function useDisclosure(initial = false): UseDisclosureReturn {
  const [isOpen, setIsOpen] = useState(initial);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, onOpen, onClose, onToggle };
}

// Usage
const { isOpen, onOpen, onClose } = useDisclosure();
```

### Animation Hook

```typescript
// src/hooks/useAnimatedCounter.ts
import { useState, useEffect } from 'react';

export function useAnimatedCounter(
  target: number,
  duration: number = 2000
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(target * progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [target, duration]);

  return count;
}
```

---

## 4. Render Props Pattern

Para componentes que necesitan control sobre el rendering.

```typescript
// src/components/shared/DataLoader.tsx
interface DataLoaderProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}

export function DataLoader<T>({
  query,
  children,
  loadingFallback = <Skeleton />,
  errorFallback = (error) => <ErrorMessage error={error} />,
}: DataLoaderProps<T>) {
  if (query.isLoading) return loadingFallback;
  if (query.isError) return errorFallback(query.error);
  if (!query.data) return null;

  return <>{children(query.data)}</>;
}

// Usage
<DataLoader query={propertyQuery}>
  {(property) => <PropertyDetails property={property} />}
</DataLoader>
```

---

## 5. Higher-Order Component Pattern

Para funcionalidad transversal.

```typescript
// src/components/hoc/withAuth.tsx
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login');
      }
    }, [user, isLoading, router]);

    if (isLoading) return <LoadingSpinner />;
    if (!user) return null;

    return <WrappedComponent {...props} />;
  };
}

// Usage
const ProtectedPage = withAuth(DashboardPage);
```

---

## Component File Structure

### Single Component

```
src/components/properties/
└── PropertyCard.tsx
```

### Complex Component

```
src/components/offers/
├── index.ts              # Exports
├── OfferCard.tsx         # Main component
├── OfferCard.types.ts    # TypeScript types
├── OfferCard.hooks.ts    # Component-specific hooks
├── OfferCard.utils.ts    # Helper functions
└── OfferCard.test.tsx    # Tests
```

### index.ts Pattern

```typescript
// src/components/offers/index.ts
export { OfferCard } from './OfferCard';
export { OfferList } from './OfferList';
export { OfferForm } from './OfferForm';
export type { OfferCardProps, OfferListProps } from './types';
```

---

## Props Patterns

### Required vs Optional

```typescript
interface Props {
  // Required
  property: Property;

  // Optional with defaults
  variant?: 'compact' | 'full';

  // Optional callbacks
  onFavorite?: (id: string) => void;
}
```

### Children Pattern

```typescript
// Explicit children
interface Props {
  children: React.ReactNode;
}

// Render function
interface Props {
  children: (data: Data) => React.ReactNode;
}

// Named slots
interface Props {
  header: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}
```

### Polymorphic Component

```typescript
type ButtonProps<T extends React.ElementType> = {
  as?: T;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<T>;

function Button<T extends React.ElementType = 'button'>({
  as,
  children,
  ...props
}: ButtonProps<T>) {
  const Component = as || 'button';
  return <Component {...props}>{children}</Component>;
}

// Usage
<Button>Click me</Button>
<Button as="a" href="/link">Link</Button>
<Button as={Link} to="/route">Router Link</Button>
```

---

## State Management in Components

### Local State

```typescript
// Use useState for UI-only state
const [isOpen, setIsOpen] = useState(false);
```

### Derived State

```typescript
// Compute from props, don't store
const isOverpriced = property.price > zoneAverage * 1.2;
```

### Global State (Zustand)

```typescript
// Use for cross-component state
const { favorites, addFavorite } = usePropertyStore();
```

### Server State (React Query)

```typescript
// Use for data from API
const { data, isLoading } = useQuery(['property', id], fetchProperty);
```

---

## Styling Patterns

### Tailwind + cn utility

```typescript
import { cn } from '@/lib/utils';

function Component({ className, variant }) {
  return (
    <div
      className={cn(
        'base-classes',
        variant === 'primary' && 'variant-classes',
        className
      )}
    />
  );
}
```

### Conditional Styles

```typescript
<div
  className={cn(
    'base',
    isActive && 'active-styles',
    isDisabled && 'opacity-50 pointer-events-none'
  )}
/>
```

---

## Accessibility Patterns

### Keyboard Navigation

```typescript
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  role="button"
  tabIndex={0}
  aria-label="Action description"
>
  {children}
</button>
```

### Screen Reader Support

```typescript
<div role="alert" aria-live="polite">
  {errorMessage}
</div>

<button aria-expanded={isOpen} aria-controls="menu-content">
  Menu
</button>
```

---

## Anti-Patterns to Avoid

### DON'T: Prop Drilling

```typescript
// Bad: Passing props through many levels
<Grandparent user={user}>
  <Parent user={user}>
    <Child user={user} />
  </Parent>
</Grandparent>

// Good: Use context or store
const user = useAuthStore((s) => s.user);
```

### DON'T: Business Logic in Components

```typescript
// Bad: Logic in component
function Component() {
  const price = data.price * 1.1; // Business logic
}

// Good: Extract to hook/util
function Component() {
  const price = calculatePriceWithTax(data.price);
}
```

### DON'T: Inline Functions in Render

```typescript
// Bad: Creates new function each render
<Button onClick={() => handleClick(id)} />

// Good: Use useCallback
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<Button onClick={handleButtonClick} />
```

---

*Ultima actualizacion: 2026-01-08*
