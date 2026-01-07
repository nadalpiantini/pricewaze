'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { Plus, Bell, User, LogOut, Home, Heart, MessageSquare, Search, Menu } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-lg">
      {/* Branding Gradient Bar */}
      <div className="h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500"></div>
      
      <div className="container mx-auto px-4">
        {/* Top Row: Logo, Search, Actions */}
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo - Full Color, No Background */}
          <Link href="/" className="flex items-center shrink-0 group">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="PriceWaze"
                width={140}
                height={42}
                className="h-10 w-auto brightness-100 contrast-100"
                priority
                style={{ mixBlendMode: 'normal' }}
              />
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10"></div>
            </div>
          </Link>

          {/* Search Bar - Prominent Center with Brand Colors */}
          <div className="flex-1 max-w-2xl mx-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-cyan-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-600 z-10" />
              <Input
                type="text"
                placeholder="Enter an address, neighborhood, city, or ZIP code"
                className="relative w-full h-11 pl-10 pr-4 text-base border-2 border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-lg transition-all duration-200 z-10"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
            ) : user ? (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden md:flex text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <Link href="/properties/new" className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    <span className="hidden lg:inline">List Property</span>
                  </Link>
                </Button>

                <Button variant="ghost" size="icon" asChild className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  <Link href="/notifications">
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-emerald-500 text-white">{getInitials(user.full_name)}</AvatarFallback>
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
                <Button variant="ghost" size="sm" asChild className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Row: Navigation with Brand Colors */}
        <nav className="hidden md:flex items-center gap-6 h-10 border-t border-gray-200">
          <Link href="/" className="text-sm font-semibold text-gray-700 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-600 hover:to-emerald-600 transition-all duration-200 relative group">
            Buy
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:w-full transition-all duration-200"></span>
          </Link>
          <Link href="/properties" className="text-sm font-semibold text-gray-700 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-600 hover:to-emerald-600 transition-all duration-200 relative group">
            Rent
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:w-full transition-all duration-200"></span>
          </Link>
          <Link href="/zones" className="text-sm font-semibold text-gray-700 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-600 hover:to-emerald-600 transition-all duration-200 relative group">
            Neighborhoods
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:w-full transition-all duration-200"></span>
          </Link>
          <Link href="/dashboard" className="text-sm font-semibold text-gray-700 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-600 hover:to-emerald-600 transition-all duration-200 relative group">
            My Home
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:w-full transition-all duration-200"></span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
