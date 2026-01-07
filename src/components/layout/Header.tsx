'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { Plus, Bell, User, LogOut, Home, Heart, MessageSquare } from 'lucide-react';
import type { Profile } from '@/types/database';

export function Header() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('pricewaze_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(profile);
      }
      setLoading(false);
    }
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-950/95 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo - PROTAGONIST */}
          <Link
            href="/"
            className="group relative flex items-center"
          >
            {/* Glow effect behind logo */}
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100" />

            {/* Logo container with animation */}
            <div className="relative">
              <Image
                src="/logo.png"
                alt="PriceWaze"
                width={200}
                height={60}
                className="h-14 w-auto drop-shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_35px_rgba(16,185,129,0.5)]"
                priority
              />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200">
              Explore
            </Link>
            <Link href="/properties" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200">
              Properties
            </Link>
            <Link href="/zones" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200">
              Zones
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-8 animate-pulse bg-zinc-800 rounded-full" />
            ) : user ? (
              <>
                <Button variant="outline" size="sm" asChild className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white">
                  <Link href="/properties/new" className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    List Property
                  </Link>
                </Button>

                <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <Link href="/notifications">
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-800">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/favorites" className="flex items-center gap-2 cursor-pointer">
                        <Heart className="h-4 w-4" />
                        Favorites
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/negotiations" className="flex items-center gap-2 cursor-pointer">
                        <MessageSquare className="h-4 w-4" />
                        Negotiations
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-destructive">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
