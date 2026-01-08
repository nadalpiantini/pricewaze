#!/usr/bin/env tsx
/**
 * Script to verify Supabase environment variables
 * Checks for hidden newlines/whitespace that break WebSockets
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 Verificando variables de entorno de Supabase...\n');

let hasErrors = false;

// Check URL
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL no encontrada');
  hasErrors = true;
} else {
  const urlTrimmed = supabaseUrl.trim();
  if (urlTrimmed !== supabaseUrl) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL tiene espacios al inicio/final');
    hasErrors = true;
  } else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', urlTrimmed.substring(0, 30) + '...');
  }
}

// Check Anon Key (most important for WebSockets)
if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY no encontrada');
  hasErrors = true;
} else {
  const keyTrimmed = supabaseAnonKey.trim();
  const keyLength = supabaseAnonKey.length;
  const trimmedLength = keyTrimmed.length;
  
  // Check for hidden newlines
  const hasNewline = supabaseAnonKey.includes('\n') || supabaseAnonKey.includes('\r');
  const hasCarriageReturn = supabaseAnonKey.includes('\r\n');
  
  if (hasNewline || hasCarriageReturn || keyLength !== trimmedLength) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY tiene saltos de línea o espacios');
    console.error('   Longitud original:', keyLength);
    console.error('   Longitud después de trim:', trimmedLength);
    if (hasNewline) {
      console.error('   ⚠️  Contiene \\n (salto de línea)');
    }
    if (hasCarriageReturn) {
      console.error('   ⚠️  Contiene \\r\\n (retorno de carro)');
    }
    console.error('\n   💡 SOLUCIÓN:');
    console.error('   1. Abre .env.local');
    console.error('   2. Asegúrate de que la línea esté en UNA SOLA LÍNEA:');
    console.error('      NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...');
    console.error('   3. NO debe haber ENTER después del =');
    console.error('   4. Guarda y reinicia el servidor\n');
    hasErrors = true;
  } else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:', keyTrimmed.substring(0, 30) + '...');
    console.log('   Longitud:', trimmedLength, 'caracteres');
  }
}

// Check Service Key
if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY no encontrada (opcional para algunas funciones)');
} else {
  const serviceTrimmed = supabaseServiceKey.trim();
  if (serviceTrimmed !== supabaseServiceKey) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY tiene espacios al inicio/final');
  } else {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', serviceTrimmed.substring(0, 30) + '...');
  }
}

// Check .env.local file directly for newlines
try {
  const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  const lines = envContent.split('\n');
  
  const anonKeyLine = lines.find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='));
  if (anonKeyLine) {
    const value = anonKeyLine.split('=')[1];
    if (value && (value.includes('\n') || value.includes('\r'))) {
      console.error('\n❌ El archivo .env.local tiene saltos de línea en la API key');
      console.error('   Revisa la línea que contiene NEXT_PUBLIC_SUPABASE_ANON_KEY');
      hasErrors = true;
    }
  }
} catch (error) {
  // .env.local might not exist, that's okay
}

if (hasErrors) {
  console.error('\n❌ Se encontraron problemas. Corrígelos antes de continuar.\n');
  process.exit(1);
} else {
  console.log('\n✅ Todas las variables están correctas. WebSockets deberían funcionar.\n');
  process.exit(0);
}
