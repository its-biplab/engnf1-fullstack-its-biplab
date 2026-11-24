'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { TriageQueue } from '@/components/triage-queue';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function TicketsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center font-sans bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-muted/30 font-sans">
      <main className="max-w-6xl mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Triage Queue & Incidents
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Review and classify inbound operational incident tickets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="size-3.5" />
              Role: {user.role}
            </span>
          </div>
        </div>

        <TriageQueue />
      </main>
    </div>
  );
}
