#!/usr/bin/env tsx
/**
 * Apply Decision Intelligence Engine migrations
 * 
 * These migrations create the Decision Intelligence system:
 * - AVM results tables
 * - Market pressure tracking
 * - Market dynamics (velocity)
 * - Decision risk calculation
 * - Fairness Score v3
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const migration1 = resolve(process.cwd(), 'supabase/migrations/20260113000001_decision_intelligence_engine.sql');
const migration2 = resolve(process.cwd(), 'supabase/migrations/20260113000002_update_fairness_function_with_ranges.sql');

console.log('🧠 Decision Intelligence Engine - Migrations\n');
console.log('═'.repeat(80));
console.log('\n📋 INSTRUCCIONES PARA APLICAR MIGRACIONES\n');
console.log('Las migraciones contienen DDL statements (CREATE TABLE, CREATE FUNCTION, etc.)');
console.log('que NO se pueden ejecutar vía API REST. Deben aplicarse manualmente.\n');
console.log('─'.repeat(80));
console.log('\n✅ OPCIÓN 1: Supabase Dashboard (Recomendado)\n');
console.log('1. Ve a: https://supabase.com/dashboard');
console.log('2. Selecciona tu proyecto (sujeto10)');
console.log('3. Abre "SQL Editor" en el menú lateral');
console.log('4. Haz clic en "New query"');
console.log('5. Copia y pega el contenido de cada migración (una a la vez)');
console.log('6. Ejecuta cada migración (Cmd+Enter / Ctrl+Enter)\n');
console.log('   Migración 1:', migration1);
console.log('   Migración 2:', migration2);
console.log('\n─'.repeat(80));
console.log('\n✅ OPCIÓN 2: Supabase CLI\n');
console.log('Si tienes Supabase CLI instalado y el proyecto vinculado:\n');
console.log('   supabase db push\n');
console.log('─'.repeat(80));
console.log('\n📄 MIGRACIÓN 1: Decision Intelligence Engine\n');
console.log('─'.repeat(80));
try {
  const sql1 = readFileSync(migration1, 'utf-8');
  console.log(sql1);
} catch (error) {
  console.error('❌ Error leyendo migración 1:', error);
}
console.log('\n─'.repeat(80));
console.log('\n📄 MIGRACIÓN 2: Update Fairness Function\n');
console.log('─'.repeat(80));
try {
  const sql2 = readFileSync(migration2, 'utf-8');
  console.log(sql2);
} catch (error) {
  console.error('❌ Error leyendo migración 2:', error);
}
console.log('\n─'.repeat(80));
console.log('\n✅ DESPUÉS DE APLICAR LAS MIGRACIONES:\n');
console.log('Puedes probar el endpoint:');
console.log('   GET /api/ai/decision-intelligence/[propertyId]?offerAmount=250000\n');
console.log('O desde el código:');
console.log('   const response = await fetch(`/api/ai/decision-intelligence/${propertyId}?offerAmount=250000`);');
console.log('   const data = await response.json();\n');

