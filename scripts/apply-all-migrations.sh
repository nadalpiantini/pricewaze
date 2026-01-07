#!/bin/bash
# Script para aplicar todas las migraciones de Supabase

echo "🔧 Aplicando migraciones de Supabase..."
echo ""

if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI encontrado"
    if [ -f ".supabase/config.toml" ]; then
        echo "🔗 Aplicando migraciones..."
        supabase db push
        echo "✅ Migraciones aplicadas!"
    else
        echo "⚠️  Proyecto no vinculado"
        echo "💡 Ejecuta: supabase link --project-ref <project-ref>"
    fi
else
    echo "❌ Supabase CLI no instalado"
    echo ""
    echo "📋 Aplicar manualmente:"
    echo "   1. Ve a Supabase Dashboard > SQL Editor"
    echo "   2. Copia: supabase/migrations/20260106000002_fix_profile_trigger.sql"
    echo "   3. Pega y ejecuta"
    echo ""
    echo "📄 Contenido de la migración:"
    cat supabase/migrations/20260106000002_fix_profile_trigger.sql
fi

