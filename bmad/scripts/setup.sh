#!/bin/bash
# BMAD Setup Script
# Instala dependencias necesarias para BMAD

set -e

echo "⚔️ BMAD Setup - Instalando dependencias"
echo "========================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no encontrado. Por favor instala Python 3.11+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✅ Python $PYTHON_VERSION detectado"

# Verificar si tomli o tomllib está disponible
if python3 -c "import tomllib" 2>/dev/null; then
    echo "✅ tomllib disponible (Python 3.11+)"
    # Actualizar scripts para usar tomllib en lugar de tomli
    echo "ℹ️  Actualizando scripts para usar tomllib..."
    find bmad/scripts -name "*.py" -exec sed -i '' 's/import tomli/import tomllib as tomli/g' {} \;
elif python3 -c "import tomli" 2>/dev/null; then
    echo "✅ tomli ya instalado"
else
    echo "📦 Instalando tomli..."
    pip3 install tomli
fi

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm no encontrado. Instalando..."
    npm install -g pnpm
fi

echo "✅ pnpm disponible"

# Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p bmad/logs
mkdir -p bmad/reports
mkdir -p bmad/tracking
mkdir -p bmad/learning

# Verificar que bmad.toml existe
if [ ! -f "bmad.toml" ]; then
    echo "❌ bmad.toml no encontrado en la raíz del proyecto"
    exit 1
fi

echo "✅ bmad.toml encontrado"

# Hacer scripts ejecutables
echo "🔧 Configurando permisos..."
chmod +x bmad/scripts/*.py
chmod +x bmad/scripts/*.sh

echo ""
echo "✅ Setup completado!"
echo ""
echo "Próximos pasos:"
echo "  1. Revisar PLAN_IMPLEMENTACION.md"
echo "  2. Seleccionar una funcionalidad"
echo "  3. Ejecutar: ./bmad/scripts/quick_start.sh <feature>"
echo ""

