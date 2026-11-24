'use client';

import React, { useEffect, useState } from 'react';
import { fetchTicketById, TicketItem, TicketEventItem } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tag,
  AlertTriangle,
  Clock,
  History,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface TicketDetailPanelProps {
  ticketId: string | null;
  onClose: () => void;
}

export function TicketDetailPanel({ ticketId, onClose }: TicketDetailPanelProps) {
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [events, setEvents] = useState<TicketEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      setEvents([]);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchTicketById(ticketId).then((res) => {
      if (!isMounted) return;
      setIsLoading(false);

      if (res.error) {
        setErrorMessage(res.error.message || 'Failed to load ticket details');
        return;
      }

      if (res.ticket) {
        setTicket(res.ticket);
        setEvents(res.events || []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const formatLocalDate = (isoDate?: string) => {
    if (!isoDate) return 'N/A';
    try {
      const d = new Date(isoDate);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
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

  return (
    <Dialog open={Boolean(ticketId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">Loading ticket details & audit history...</p>
          </div>
        ) : errorMessage ? (
          <div className="py-8 space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : ticket ? (
          <>
            <DialogHeader className="space-y-2 border-b pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                  {ticket.externalId}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getCategoryColor(
                    ticket.category
                  )}`}
                >
                  {ticket.category}
                </span>
                <Badge
                  variant={getPriorityBadgeVariant(ticket.priority) as any}
                  className="text-xs uppercase"
                >
                  {ticket.priority === 'URGENT' && (
                    <AlertTriangle className="size-3 mr-1 text-current" />
                  )}
                  {ticket.priority}
                </Badge>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                  {ticket.status}
                </span>
                {ticket.isHumanOverride && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium">
                    <UserCheck className="size-3" />
                    Human Override Active
                  </span>
                )}
              </div>

              {/* T-B5: XSS-safe text interpolation for subject */}
              <DialogTitle className="text-base sm:text-xl font-bold leading-snug break-words">
                {ticket.subject}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>ID: <code className="font-mono text-[11px] text-foreground">{ticket.id}</code></span>
                <span>•</span>
                <span>Created: {formatLocalDate(ticket.createdAt)}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-5 py-3 pr-1">
              {/* Ticket Body Content */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description / Body
                </h4>
                {/* T-B5: XSS-safe text interpolation for body */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed break-words font-sans">
                  {ticket.body}
                </div>
              </div>

              {/* Ticket Key Attributes Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  <span>Metadata & Classification</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg border bg-background space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Auto Category</span>
                    <div className="font-medium text-foreground flex items-center gap-1">
                      <Tag className="size-3 text-muted-foreground" />
                      <span>{ticket.autoCategory}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-background space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Assignee</span>
                    <div className="font-medium text-foreground flex items-center gap-1">
                      <User className="size-3 text-muted-foreground" />
                      <span className="truncate">{ticket.assigneeId || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-background space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Reviewed Status</span>
                    <div className="font-medium text-foreground flex items-center gap-1">
                      <CheckCircle2
                        className={`size-3 ${
                          ticket.isReviewed ? 'text-emerald-600' : 'text-muted-foreground'
                        }`}
                      />
                      <span>{ticket.isReviewed ? 'Reviewed' : 'Pending Review'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-background space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Created At (Local)</span>
                    <div className="font-medium text-foreground flex items-center gap-1">
                      <Calendar className="size-3 text-muted-foreground" />
                      <span className="truncate">{formatLocalDate(ticket.createdAt)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-background space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Updated At (Local)</span>
                    <div className="font-medium text-foreground flex items-center gap-1">
                      <Clock className="size-3 text-muted-foreground" />
                      <span className="truncate">{formatLocalDate(ticket.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-background space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Override State</span>
                    <div className="font-medium text-foreground">
                      {ticket.isHumanOverride ? 'Protected' : 'Auto-Derived'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Trail History */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History className="size-3.5" />
                    <span>Audit Trail History</span>
                  </h4>
                  <Badge variant="outline" className="text-[11px]">
                    {events.length} {events.length === 1 ? 'event' : 'events'}
                  </Badge>
                </div>

                {events.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                    No audit trail events recorded yet for this ticket.
                  </div>
                ) : (
                  <div className="rounded-xl border divide-y overflow-hidden text-xs">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 bg-background hover:bg-muted/20 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] uppercase font-bold text-foreground">
                              {event.field}
                            </span>
                            <span className="text-muted-foreground">modified</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {formatLocalDate(event.createdAt)}
                          </span>
                        </div>

                        {/* Value Transition */}
                        <div className="flex items-center gap-2 text-foreground font-mono text-xs flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                            {event.oldValue !== null && event.oldValue !== undefined
                              ? String(event.oldValue)
                              : 'null'}
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                            {event.newValue !== null && event.newValue !== undefined
                              ? String(event.newValue)
                              : 'null'}
                          </span>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span>Actor:</span>
                          <span className="font-medium text-foreground">{event.actor}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
