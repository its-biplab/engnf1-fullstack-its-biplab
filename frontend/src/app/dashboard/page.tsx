'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { fetchTickets, TicketItem, ImportResult } from '@/lib/api';
import { TicketImportPanel } from '@/components/ticket-import-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  ShieldCheck,
  Ticket as TicketIcon,
  Loader2,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  CheckCircle,
  Inbox,
  Filter,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [totalTickets, setTotalTickets] = useState<number>(0);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [lastImportBanner, setLastImportBanner] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load tickets from backend
  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    const { tickets: fetched, total, error } = await fetchTickets();
    setTicketsLoading(false);

    if (!error && fetched) {
      setTickets(fetched);
      setTotalTickets(total || fetched.length);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
    }
  }, [isAuthenticated, loadTickets]);

  const handleImportSuccess = (result: ImportResult) => {
    setLastImportBanner(
      `Feed import completed: ${result.importedCount} new, ${result.updatedCount} updated, ${result.skippedOverrideCount} override protected (Total: ${result.total})`
    );
    loadTickets();
  };

  const filteredTickets = tickets.filter((t) => {
    if (categoryFilter === 'ALL') return true;
    return t.category === categoryFilter;
  });

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'BILLING':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case 'LOGIN':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'DELIVERY':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'BUG':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
      case 'FEATURE_REQUEST':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

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
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Triage Workspace
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Logged in as <span className="font-medium text-foreground">{user.name}</span> ({user.email})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="size-3.5" />
              Role: {user.role}
            </span>
          </div>
        </div>

        {/* Import Banner Notification */}
        {lastImportBanner && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{lastImportBanner}</span>
            </div>
            <button
              onClick={() => setLastImportBanner(null)}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Triage Queue Card */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <TicketIcon className="size-5 text-primary" />
                  <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
                    Triage Queue
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'}
                  </Badge>
                </div>
                <CardDescription className="text-xs sm:text-sm">
                  External feed ingestion, deterministic auto-classification, and triage management.
                </CardDescription>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTickets}
                  disabled={ticketsLoading}
                  className="gap-1.5 h-8 text-xs cursor-pointer"
                >
                  <RefreshCw className={`size-3.5 ${ticketsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
                <TicketImportPanel onImportSuccess={handleImportSuccess} />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 pt-3 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="flex items-center gap-1 text-muted-foreground mr-1 text-xs shrink-0">
                <Filter className="size-3" /> Filter:
              </span>
              {['ALL', 'BILLING', 'LOGIN', 'DELIVERY', 'BUG', 'FEATURE_REQUEST'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {cat === 'ALL' ? 'All Categories' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {ticketsLoading && tickets.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-7 animate-spin text-primary" />
                <p className="text-sm">Loading tickets feed...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-14 px-4 text-center space-y-3">
                <div className="mx-auto size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Inbox className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-foreground">
                    {tickets.length === 0 ? 'No tickets in queue' : 'No matching tickets'}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                    {tickets.length === 0
                      ? 'Import external feed tickets using the "Import Feed" action above to begin auto-triaging.'
                      : `No tickets classified as ${categoryFilter}. Switch filter or import new feed tickets.`}
                  </p>
                </div>
                {tickets.length === 0 && (
                  <div className="pt-2">
                    <TicketImportPanel onImportSuccess={handleImportSuccess} />
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id || ticket.externalId}
                    className="p-3.5 sm:p-5 hover:bg-muted/30 transition-colors space-y-2.5"
                  >
                    {/* Header Row: ExternalId, Subject, Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {ticket.externalId}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryColor(
                              ticket.category
                            )}`}
                          >
                            {ticket.category}
                          </span>
                          <Badge
                            variant={getPriorityBadgeVariant(ticket.priority) as any}
                            className="text-[11px] uppercase tracking-wider"
                          >
                            {ticket.priority === 'URGENT' && (
                              <AlertTriangle className="size-3 mr-0.5 text-current" />
                            )}
                            {ticket.priority}
                          </Badge>
                          {ticket.isHumanOverride && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <UserCheck className="size-2.5" />
                              Override Protected
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm sm:text-base text-foreground leading-snug break-words">
                          {ticket.subject}
                        </h4>
                      </div>

                      {/* Status and timestamp */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between text-xs text-muted-foreground shrink-0 gap-1 pt-1 sm:pt-0">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground">
                          {ticket.status}
                        </span>
                        <span className="text-[11px]">
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleDateString()
                            : 'Just now'}
                        </span>
                      </div>
                    </div>

                    {/* Body Preview */}
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words">
                      {ticket.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
