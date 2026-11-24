'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, LogOut, LogIn, UserPlus, User } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-3 sm:px-6">
        {/* Left: Brand */}
        <Link
          href={isAuthenticated ? '/dashboard' : '/'}
          className="flex items-center gap-2 font-bold tracking-tight text-base sm:text-lg hover:opacity-90 transition-opacity shrink-0"
        >
          <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
            TS
          </div>
          <span>TriageSync</span>
        </Link>

        {/* Right: Auth Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {isAuthenticated && user ? (
            <>
              {/* User Identity & Role Badge */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="size-6 sm:size-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <User className="size-3.5 sm:size-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[200px]">
                    {user.name}
                  </span>
                </div>

                {/* Role Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold shrink-0 ${
                    user.role === 'ADMIN'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {user.role === 'ADMIN' ? (
                    <ShieldAlert className="size-2.5 sm:size-3" />
                  ) : (
                    <Shield className="size-2.5 sm:size-3" />
                  )}
                  {user.role}
                </span>
              </div>

              {/* Logout Action */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 shrink-0 px-2 sm:px-3 h-8 text-xs font-medium"
              >
                <LogOut className="size-3.5" />
                <span className="hidden xs:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs sm:text-sm h-8 px-2.5">
                  <LogIn className="size-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="gap-1.5 text-xs sm:text-sm h-8 px-2.5">
                  <UserPlus className="size-3.5" />
                  <span>Register</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
