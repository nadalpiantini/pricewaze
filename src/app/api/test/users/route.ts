/**
 * Test API endpoint for creating confirmed users (E2E testing only)
 *
 * This endpoint bypasses email verification for test automation.
 * ONLY available in non-production environments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client directly with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  // Security: Only allow in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoints are disabled in production' },
      { status: 403 }
    );
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create fresh admin client for this request
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Sign up user using regular API (through admin client which has elevated permissions)
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || 'Test User',
        },
      },
    });

    if (signUpError) {
      // If user exists, try to sign them in to verify credentials work
      if (signUpError.message.includes('already registered')) {
        console.log('[Test API] User exists, verifying credentials');
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          return NextResponse.json(
            { error: `User exists but credentials don't match: ${signInError.message}` },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          user: {
            id: signInData.user?.id,
            email: signInData.user?.email,
          },
          message: 'User already exists and credentials verified',
        });
      }

      console.log('[Test API] Sign up error:', signUpError.message);
      return NextResponse.json(
        { error: `Sign up failed: ${signUpError.message}` },
        { status: 500 }
      );
    }

    if (!signUpData.user) {
      return NextResponse.json(
        { error: 'No user returned from sign up' },
        { status: 500 }
      );
    }

    // For Supabase projects with email confirmation disabled, user is immediately usable
    // For those with confirmation required, we need to manually confirm via database
    // Since admin API has issues, let's try to confirm directly in the database
    const { error: confirmError } = await supabaseAdmin
      .from('auth.users')
      .update({
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', signUpData.user.id);

    // If direct table update fails (common due to auth schema restrictions),
    // try using RPC or just proceed - user might be auto-confirmed
    if (confirmError) {
      console.log('[Test API] Could not confirm email directly:', confirmError.message);
      // Try signIn to check if user is usable anyway
      const { data: testSignIn, error: testError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (testError) {
        // If email confirmation is required and we can't confirm, return specific error
        if (testError.message.includes('Email not confirmed')) {
          return NextResponse.json({
            error: 'User created but email confirmation required. Please disable email confirmation in Supabase dashboard for testing.',
            userId: signUpData.user.id,
          }, { status: 500 });
        }
        return NextResponse.json(
          { error: `Sign in test failed: ${testError.message}` },
          { status: 500 }
        );
      }

      console.log('[Test API] User is usable (sign in worked)');
    }

    // Create profile entry
    const { error: profileError } = await supabaseAdmin
      .from('pricewaze_profiles')
      .upsert({
        id: signUpData.user.id,
        full_name: fullName || 'Test User',
        role: 'buyer',
        verified: true,
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn('[Test API] Profile creation warning:', profileError.message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: signUpData.user.id,
        email: signUpData.user.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Test API] Server error:', error);
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to clean up test users
 */
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoints are disabled in production' },
      { status: 403 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Admin client not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email query parameter required' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json({ success: true, message: 'User not found (already deleted)' });
    }

    // Delete user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
