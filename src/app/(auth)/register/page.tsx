'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Mail, Lock, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Premium input wrapper
function PremiumInput({
  id,
  type,
  placeholder,
  value,
  onChange,
  disabled,
  icon: Icon,
  hint,
  ...props
}: {
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  icon: typeof Mail;
  hint?: string;
  'data-testid'?: string;
  minLength?: number;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          'relative rounded-xl transition-all duration-300',
          focused && 'ring-2 ring-[var(--signal-cyan)]/30'
        )}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          boxShadow: focused ? '0 0 20px rgba(0, 212, 255, 0.1)' : 'none',
        }}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Icon
            className={cn(
              'h-4 w-4 transition-colors',
              focused ? 'text-[var(--signal-cyan)]' : 'text-muted-foreground'
            )}
          />
        </div>
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="pl-10 h-12 bg-transparent border-white/10 focus:border-[var(--signal-cyan)]/50 rounded-xl"
          {...props}
        />
      </div>
      {hint && (
        <p className="text-xs text-muted-foreground pl-1">{hint}</p>
      )}
    </div>
  );
}

// Password strength indicator
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Contains number', met: /\d/.test(password) },
    { label: 'Contains letter', met: /[a-zA-Z]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {checks.map((check) => (
        <div
          key={check.label}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all',
            check.met
              ? 'bg-green-500/10 text-green-400'
              : 'bg-white/5 text-muted-foreground'
          )}
        >
          {check.met && <Check className="h-3 w-3" />}
          <span>{check.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setTimeout(() => setFormVisible(true), 100);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match', { description: 'Please make sure your passwords match.' });
      return;
    }

    if (password.length < 8) {
      toast.error('Password too short', { description: 'Password must be at least 8 characters long.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error('Registration failed', { description: error.message });
        return;
      }

      toast.success('Account created!', { description: 'Let\'s set up your preferences.' });

      // Redirect to onboarding instead of login
      router.push('/onboarding');
    } catch {
      toast.error('Something went wrong', { description: 'Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error('Sign up failed', { description: error.message });
    }
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03) inset',
        opacity: formVisible ? 1 : 0,
        transform: formVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.5s ease-out',
      }}
    >
      {/* Header */}
      <div className="p-6 pb-4 text-center">
        <h2 className="text-xl font-semibold text-foreground">Create an account</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Start discovering fair prices and making smarter offers
        </p>
      </div>

      {/* Form */}
      <div className="p-6 pt-2">
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full Name
            </Label>
            <PremiumInput
              id="fullName"
              data-testid="full-name-input"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              icon={User}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <PremiumInput
              id="email"
              data-testid="email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              icon={Mail}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <PremiumInput
              id="password"
              data-testid="password-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              icon={Lock}
              minLength={8}
            />
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <PremiumInput
                id="confirmPassword"
                data-testid="confirm-password-input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                icon={Lock}
              />
              {passwordsMatch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="h-4 w-4 text-green-400" />
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            data-testid="register-button"
            className="w-full h-12 rounded-xl font-medium transition-all duration-300 group"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, var(--signal-cyan) 0%, var(--signal-teal) 100%)',
              boxShadow: '0 0 30px rgba(0, 212, 255, 0.2)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-3 text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google button */}
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all"
          onClick={handleGoogleSignUp}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-[var(--signal-cyan)] hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-[var(--signal-cyan)] hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="p-6 pt-2 text-center border-t border-white/5">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-[var(--signal-cyan)] hover:text-[var(--signal-lime)] transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
