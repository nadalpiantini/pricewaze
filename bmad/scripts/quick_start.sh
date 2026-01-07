#!/bin/bash
# BMAD Quick Start Script
# Inicia un sprint completo para una funcionalidad

set -e

FEATURE=$1

if [ -z "$FEATURE" ]; then
    echo "❌ Uso: ./quick_start.sh <feature_name>"
    echo ""
    echo "Features disponibles:"
    echo "  - comparison    (Comparación de propiedades)"
    echo "  - alerts        (Alertas inteligentes)"
    echo "  - gallery       (Galería mejorada)"
    echo "  - reviews       (Reviews y ratings)"
    echo "  - chat          (Chat en tiempo real)"
    echo "  - valuation     (Estimación automática)"
    echo "  - heatmap       (Heatmaps de precios)"
    echo "  - crm           (CRM básico)"
    echo "  - insights      (Market insights)"
    echo "  - api           (API REST pública)"
    exit 1
fi

echo "⚔️ BMAD Orchestrated Full Cycle 3.0"
echo "===================================="
echo ""
echo "🚀 Iniciando sprint para: $FEATURE"
echo ""

# Iniciar tracking
python3 bmad/scripts/feature_tracker.py --start "$FEATURE"

# Ejecutar orquestador
python3 bmad/scripts/orchestrator.py --feature "$FEATURE"

# Generar reporte
echo ""
echo "📊 Generando reporte..."
python3 bmad/scripts/feature_tracker.py --report

echo ""
echo "✅ Sprint completado para: $FEATURE"
echo ""
echo "📁 Logs disponibles en: bmad/logs/"
echo "📊 Reportes disponibles en: bmad/reports/"

