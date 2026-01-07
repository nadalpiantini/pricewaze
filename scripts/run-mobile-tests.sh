#!/bin/bash

# Mobile Design Recheck Script
# Ejecuta tests móviles y genera reporte

set -e

echo "🚀 Iniciando Mobile Design Recheck..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Playwright esté instalado
if ! command -v playwright &> /dev/null; then
    echo "📦 Instalando Playwright..."
    pnpm add -D @playwright/test
    npx playwright install
fi

# Verificar que el servidor esté corriendo
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️  Servidor no detectado en localhost:3000"
    echo "   Iniciando servidor en background..."
    pnpm dev &
    SERVER_PID=$!
    sleep 5
    echo "✅ Servidor iniciado (PID: $SERVER_PID)"
else
    echo "✅ Servidor detectado en localhost:3000"
fi

echo ""
echo "🧪 Ejecutando tests móviles..."
echo ""

# Ejecutar tests
pnpm test:mobile || TEST_EXIT_CODE=$?

echo ""
echo "📊 Generando reporte..."

# Mostrar resumen
if [ -f "playwright-report-mobile/results.json" ]; then
    echo ""
    echo "${GREEN}✅ Tests completados${NC}"
    echo ""
    echo "Para ver el reporte HTML:"
    echo "  ${YELLOW}npx playwright show-report playwright-report-mobile${NC}"
    echo ""
else
    echo "${YELLOW}⚠️  No se generó reporte de resultados${NC}"
fi

# Limpiar servidor si lo iniciamos
if [ ! -z "$SERVER_PID" ]; then
    echo "🛑 Deteniendo servidor..."
    kill $SERVER_PID 2>/dev/null || true
fi

exit ${TEST_EXIT_CODE:-0}

