'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuthToken,
  getStoredUser,
  clearSession,
  fetchCurrentUser,
  UserResponse,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LayoutDashboard,
  LogOut,
  User,
  ShieldCheck,
  Ticket,
  Calendar,
  Loader2,
  CheckCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionVerified, setSessionVerified] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const localUser = getStoredUser();
    if (localUser) {
      setUser(localUser);
    }

    // Verify session with backend /api/auth/me
    fetchCurrentUser().then((res) => {
      if (res.user) {
        setUser(res.user);
        setSessionVerified(true);
      } else if (res.error?.code === 'UNAUTHENTICATED') {
        clearSession();
        router.push('/login');
        return;
      }
      setIsLoading(false);
    });
  }, [router]);

  const handleSignOut = () => {
    clearSession();
    router.push('/login');
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-muted/40">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
            <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs">
              TS
            </div>
            <span>TriageSync</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="font-medium text-foreground">{user?.name}</span>
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name || 'User'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your session is active and authenticated with JWT.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="size-3.5" />
              Role: {user?.role || 'USER'}
            </span>
          </div>
        </div>

        {sessionVerified && (
          <Alert className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-xs">
              Session token verified against <code>/api/auth/me</code>. Authorization header is configured for all requests.
            </AlertDescription>
          </Alert>
        )}

        {/* Feature Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                <Ticket className="size-5" />
              </div>
              <CardTitle className="text-base">Tickets & Incidents</CardTitle>
              <CardDescription className="text-xs">
                Manage, categorize, and track operational issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Triage queue and event timeline ready for incident management.
              </p>
            </CardContent>
            <CardFooter className="pt-0 border-t py-3">
              <span className="text-xs font-medium text-primary">Triage Ready</span>
            </CardFooter>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                <Calendar className="size-5" />
              </div>
              <CardTitle className="text-base">Resource Bookings</CardTitle>
              <CardDescription className="text-xs">
                Schedule rooms, equipment, and lab reservations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Collision-free resource scheduling with status workflow.
              </p>
            </CardContent>
            <CardFooter className="pt-0 border-t py-3">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Active System
              </span>
            </CardFooter>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="size-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1">
                <User className="size-5" />
              </div>
              <CardTitle className="text-base">User Profile</CardTitle>
              <CardDescription className="text-xs">
                Account identifiers and permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <div>
                <strong className="text-foreground">ID:</strong> {user?.id}
              </div>
              <div>
                <strong className="text-foreground">Email:</strong> {user?.email}
              </div>
              <div>
                <strong className="text-foreground">Joined:</strong>{' '}
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recent'}
              </div>
            </CardContent>
            <CardFooter className="pt-0 border-t py-3">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                Verified Account
              </span>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
