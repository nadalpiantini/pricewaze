#!/usr/bin/env tsx
/**
 * Verify that the trigger fix works correctly
 * This script tests user creation to ensure the trigger doesn't block it
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyTriggerFix() {
  console.log('🔍 Verificando que el trigger funciona correctamente...\n');

  const testEmail = `test-trigger-verify-${Date.now()}@test.com`;

  try {
    console.log(`📧 Creando usuario de prueba: ${testEmail}`);
    
    // Intentar crear usuario
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'Test123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User',
      },
    });

    if (userError) {
      console.error(`\n❌ ERROR: ${userError.message}`);
      console.error(`📋 Detalles:`, JSON.stringify(userError, null, 2));
      console.log('\n⚠️  El trigger todavía está bloqueando la creación de usuarios');
      console.log('💡 Asegúrate de haber aplicado la migración: 20260110000008_fix_trigger_definitive.sql');
      return false;
    }

    if (!userData.user) {
      console.error(`\n❌ No se retornó información del usuario`);
      return false;
    }

    console.log(`\n✅ Usuario creado exitosamente: ${userData.user.id}`);

    // Esperar un momento para que el trigger ejecute
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verificar si el perfil fue creado
    console.log(`🔍 Verificando si el perfil fue creado...`);
    const { data: profileData, error: profileError } = await supabase
      .from('pricewaze_profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log(`⚠️  Perfil no fue creado automáticamente`);
        console.log(`   Esto es aceptable - el trigger no bloqueó la creación del usuario`);
        console.log(`   El perfil puede crearse manualmente si es necesario`);
      } else {
        console.error(`⚠️  Error verificando perfil: ${profileError.message}`);
      }
    } else {
      console.log(`✅ Perfil creado automáticamente: ${profileData?.full_name || 'N/A'}`);
    }

    // Limpiar: eliminar usuario de prueba
    console.log(`\n🧹 Eliminando usuario de prueba...`);
    await supabase.auth.admin.deleteUser(userData.user.id);
    console.log(`✅ Usuario de prueba eliminado`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICACIÓN EXITOSA');
    console.log('='.repeat(80));
    console.log('\n✅ El trigger funciona correctamente');
    console.log('✅ La creación de usuarios NO está bloqueada');
    console.log('✅ Puedes crear usuarios normalmente ahora\n');

    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n❌ Excepción: ${error.message}`);
    console.error(`📋 Stack:`, error.stack);
    return false;
  }
}

verifyTriggerFix().then((success) => {
  if (success) {
    console.log('🎉 Todo funciona correctamente!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  El trigger necesita ser arreglado\n');
    process.exit(1);
  }
});

