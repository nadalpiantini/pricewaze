# Mobile Design Recheck - Playwright Tests

Sistema completo de testing móvil para PriceWaze usando Playwright. Verifica el diseño responsive en múltiples dispositivos móviles y tablets.

## 📱 Dispositivos Testeados

- **iPhone SE** (375x667) - Móvil pequeño
- **iPhone 12/13/14 Pro** (390x844) - Móvil estándar
- **iPhone 14 Pro Max** (430x932) - Móvil grande
- **iPad Mini** (768x1024) - Tablet pequeño
- **iPad Pro** (1024x1366) - Tablet grande

## 🚀 Uso

### Instalación

```bash
# Instalar dependencias
pnpm install

# Instalar navegadores de Playwright
npx playwright install
```

### Ejecutar Tests

```bash
# Ejecutar todos los tests móviles
pnpm test:mobile

# Ejecutar con UI interactiva
pnpm test:mobile:ui

# Ejecutar en modo debug
pnpm test:mobile:debug

# Ejecutar en un dispositivo específico
npx playwright test --project=mobile-iphone-12
```

### Ver Reportes

```bash
# Abrir reporte HTML
npx playwright show-report playwright-report-mobile
```

## 📋 Tests Incluidos

### Dashboard (`dashboard.spec.ts`)
- ✅ Visualización correcta en móvil
- ✅ Sidebar colapsable
- ✅ Botón de menú móvil
- ✅ Sin overflow horizontal
- ✅ Texto legible
- ✅ Imágenes responsivas

### Properties (`properties.spec.ts`)
- ✅ Lista de propiedades
- ✅ Cards responsivas
- ✅ Modal de detalle móvil-friendly
- ✅ Filtros funcionales

### Offers (`offers.spec.ts`)
- ✅ Página de ofertas
- ✅ Cards responsivas
- ✅ Sin overflow

### Visits (`visits.spec.ts`)
- ✅ Página de visitas
- ✅ Cards responsivas
- ✅ Sin overflow

### Routes (`routes.spec.ts`)
- ✅ Página de rutas
- ✅ Mapa responsivo
- ✅ Sin overflow

### Global (`global.spec.ts`)
- ✅ Viewport meta tag
- ✅ Sin scroll horizontal en todas las páginas
- ✅ Touch targets adecuados
- ✅ Cambio de orientación
- ✅ Tests en todos los breakpoints

## 🔧 Helpers

### AuthHelper
Maneja autenticación para los tests:
- `login(email, password)` - Login con credenciales
- `logout()` - Cerrar sesión
- `isAuthenticated()` - Verificar estado de autenticación

### MobileChecks
Validaciones específicas para móvil:
- `checkNoHorizontalOverflow()` - Sin scroll horizontal
- `checkTouchTargets()` - Tamaños mínimos de touch (44x44px)
- `checkSidebarMobileBehavior()` - Comportamiento del sidebar
- `checkMobileMenuButton()` - Botón de menú móvil
- `checkTextReadability()` - Tamaño de texto legible
- `checkModalMobileFriendly()` - Modales móvil-friendly
- `checkResponsiveImages()` - Imágenes responsivas
- `checkViewportMeta()` - Meta tag viewport
- `takeScreenshot(name)` - Captura de pantalla
- `runAllChecks()` - Ejecutar todas las validaciones

## 📊 Configuración

El archivo `playwright.mobile.config.ts` define:
- Viewports de dispositivos
- Configuración de reportes
- Servidor de desarrollo automático
- Retries y timeouts

## 🐛 Troubleshooting

### Tests fallan por autenticación
Asegúrate de tener un usuario de prueba:
```bash
pnpm seed
```

### Servidor no inicia
Verifica que el puerto 3000 esté libre:
```bash
lsof -ti:3000 | xargs kill -9
```

### Screenshots no se generan
Crea el directorio manualmente:
```bash
mkdir -p tests/mobile/screenshots
```

## 📝 Notas

- Los tests asumen que el servidor está corriendo en `http://localhost:3000`
- Se usa un usuario de prueba por defecto: `test@pricewaze.com` / `test123456`
- Los screenshots se guardan en `tests/mobile/screenshots/`
- Los reportes se generan en `playwright-report-mobile/`

