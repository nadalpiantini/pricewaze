#!/usr/bin/env tsx
/**
 * Verification script to test all connections:
 * - Supabase database (tables with pricewaze_ prefix)
 * - CrewAI backend API
 * - Frontend configuration
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const crewaiUrl = process.env.CREWAI_API_URL || 'http://localhost:8000';

console.log('🔍 Verificando conexiones de PriceWaze...\n');

// 1. Verificar Supabase
async function verifySupabase() {
  console.log('📊 Verificando Supabase...');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables de entorno de Supabase faltantes');
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
    
    // Verificar tablas con prefijo pricewaze_
    const tables = [
      'pricewaze_profiles',
      'pricewaze_properties',
      'pricewaze_zones',
      'pricewaze_offers',
      'pricewaze_visits',
      'pricewaze_agreements',
    ];

    console.log('   Verificando tablas...');
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, pero tabla existe
          console.error(`   ❌ Tabla ${table}: ${error.message}`);
          return false;
        }
        console.log(`   ✅ Tabla ${table} existe`);
      } catch (err: any) {
        console.error(`   ❌ Error verificando ${table}: ${err.message}`);
        return false;
      }
    }

    console.log('   ✅ Conexión a Supabase exitosa\n');
    return true;
  } catch (error: any) {
    console.error(`   ❌ Error conectando a Supabase: ${error.message}\n`);
    return false;
  }
}

// 2. Verificar CrewAI
async function verifyCrewAI() {
  console.log('🤖 Verificando CrewAI Backend...');
  
  try {
    const response = await fetch(`${crewaiUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error(`   ❌ CrewAI no responde (status: ${response.status})`);
      return false;
    }

    const data = await response.json();
    console.log(`   ✅ CrewAI está corriendo`);
    console.log(`   📊 Modelo: ${data.model || 'N/A'}`);
    console.log(`   🔗 Supabase conectado: ${data.supabase_connected ? 'Sí' : 'No'}`);
    console.log(`   🎯 Crews disponibles: ${data.crews_available?.join(', ') || 'N/A'}\n`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Error conectando a CrewAI: ${error.message}`);
    console.error(`   💡 Asegúrate de que el servidor CrewAI esté corriendo en ${crewaiUrl}\n`);
    return false;
  }
}

// 3. Verificar variables de entorno
function verifyEnvVars() {
  console.log('🔐 Verificando variables de entorno...');
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEEPSEEK_API_KEY',
    'NEXT_PUBLIC_MAPBOX_TOKEN',
  ];

  const optional = [
    'CREWAI_API_URL',
    'NEXT_PUBLIC_MARKET_CODE',
    'DEEPSEEK_BASE_URL',
    'DEEPSEEK_MODEL',
  ];

  let allOk = true;

  for (const varName of required) {
    if (!process.env[varName]) {
      console.error(`   ❌ ${varName} faltante`);
      allOk = false;
    } else {
      console.log(`   ✅ ${varName} configurada`);
    }
  }

  for (const varName of optional) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName} configurada (opcional)`);
    } else {
      console.log(`   ⚠️  ${varName} no configurada (opcional)`);
    }
  }

  console.log('');
  return allOk;
}

// Ejecutar verificaciones
async function main() {
  const envOk = verifyEnvVars();
  const supabaseOk = await verifySupabase();
  const crewaiOk = await verifyCrewAI();

  console.log('='.repeat(60));
  if (envOk && supabaseOk && crewaiOk) {
    console.log('✅ TODAS LAS CONEXIONES ESTÁN FUNCIONANDO');
    console.log('🚀 El sistema está listo para usar');
  } else {
    console.log('❌ ALGUNAS CONEXIONES FALLARON');
    console.log('\nRevisa los errores arriba y corrige la configuración');
    process.exit(1);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);

