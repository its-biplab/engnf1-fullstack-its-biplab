'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { fetchTickets, TicketItem, ImportResult } from '@/lib/api';
import { TicketImportPanel } from '@/components/ticket-import-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Search,
  RefreshCw,
  Filter,
  X,
  AlertTriangle,
  UserCheck,
  CheckCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Ticket as TicketIcon,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: '' },
  { label: 'Billing', value: 'BILLING' },
  { label: 'Bug', value: 'BUG' },
  { label: 'Feature Request', value: 'FEATURE_REQUEST' },
  { label: 'Login', value: 'LOGIN' },
  { label: 'Delivery', value: 'DELIVERY' },
];

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: '' },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

export function TriageQueue() {
  const [, startTransition] = useTransition();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data state
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Debounce search term by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 whenever filters change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (val: string) => {
    setter(val);
    setPage(1);
  };

  // Fetch tickets from API
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const params: {
      status?: string;
      category?: string;
      priority?: string;
      q?: string;
      page: number;
      pageSize: number;
    } = {
      page,
      pageSize,
    };

    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (debouncedSearch.trim()) params.q = debouncedSearch.trim();

    const result = await fetchTickets(params);
    setIsLoading(false);

    if (result.error) {
      setErrorMessage(result.error.message || 'Failed to load tickets');
      return;
    }

    startTransition(() => {
      const items = result.data || result.tickets || [];
      setTickets(items);
      setTotal(result.total ?? items.length);
      setTotalPages(result.totalPages ?? 1);
    });
  }, [page, pageSize, statusFilter, categoryFilter, priorityFilter, debouncedSearch]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  const handleImportSuccess = (result: ImportResult) => {
    setImportNotice(
      `Feed import completed: ${result.importedCount} new, ${result.updatedCount} updated, ${result.skippedOverrideCount} override protected (Total: ${result.total})`
    );
    loadTickets();
  };

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) ||
    Boolean(statusFilter) ||
    Boolean(categoryFilter) ||
    Boolean(priorityFilter);

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
    <Card className="shadow-sm overflow-hidden">
      {/* Header with Title and Import Trigger */}
      <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <TicketIcon className="size-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
                Triage Queue
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {total} {total === 1 ? 'ticket' : 'tickets'}
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Live operational incident queue with injection-safe search and automated classification.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTickets}
              disabled={isLoading}
              className="gap-1.5 h-8 text-xs cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <TicketImportPanel onImportSuccess={handleImportSuccess} />
          </div>
        </div>

        {/* Dynamic Filter Bar */}
        <div className="pt-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* Search Input (q) */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search subject or body..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 h-8 text-xs w-full bg-background"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
                className="w-full h-8 text-xs px-2.5 rounded-lg border border-input bg-background text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                aria-label="Filter by Category"
                value={categoryFilter}
                onChange={(e) => handleFilterChange(setCategoryFilter)(e.target.value)}
                className="w-full h-8 text-xs px-2.5 rounded-lg border border-input bg-background text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Dropdown */}
            <div>
              <select
                aria-label="Filter by Priority"
                value={priorityFilter}
                onChange={(e) => handleFilterChange(setPriorityFilter)(e.target.value)}
                className="w-full h-8 text-xs px-2.5 rounded-lg border border-input bg-background text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Indicators & Clear Action */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Filter className="size-3" />
                  Active Filters:
                </span>
                {debouncedSearch && (
                  <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                    q: &quot;{debouncedSearch}&quot;
                    <X className="size-2.5 cursor-pointer" onClick={() => setSearchTerm('')} />
                  </Badge>
                )}
                {statusFilter && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    status: {statusFilter}
                    <X className="size-2.5 cursor-pointer" onClick={() => setStatusFilter('')} />
                  </Badge>
                )}
                {categoryFilter && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    category: {categoryFilter}
                    <X className="size-2.5 cursor-pointer" onClick={() => setCategoryFilter('')} />
                  </Badge>
                )}
                {priorityFilter && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    priority: {priorityFilter}
                    <X className="size-2.5 cursor-pointer" onClick={() => setPriorityFilter('')} />
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="xs"
                onClick={handleClearFilters}
                className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Import Notification Banner */}
      {importNotice && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{importNotice}</span>
          </div>
          <button
            onClick={() => setImportNotice(null)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4">
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content Area */}
      <CardContent className="p-0">
        {isLoading && tickets.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-xs sm:text-sm">Fetching queue tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="mx-auto size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <Inbox className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base text-foreground">
                {hasActiveFilters ? 'No matching tickets found' : 'No tickets in queue'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'Try modifying your search criteria or resetting filters to see available tickets.'
                  : 'Import external feed tickets using the "Import Feed" action to populate the queue.'}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs mt-2">
                Reset Filters
              </Button>
            ) : (
              <div className="pt-2">
                <TicketImportPanel onImportSuccess={handleImportSuccess} />
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((ticket) => (
              <div
                key={ticket.id || ticket.externalId}
                className="p-3.5 sm:p-5 hover:bg-muted/30 transition-colors space-y-2.5"
              >
                {/* Header Row: ExternalId, Badges, Dates */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
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

                    {/* T-B5: XSS-safe text interpolation for subject */}
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

                {/* T-B5: XSS-safe text interpolation for body */}
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words">
                  {ticket.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Pagination Footer */}
      {total > 0 && (
        <CardFooter className="p-3 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, total)} -{' '}
              {Math.min(page * pageSize, total)} of {total} tickets
            </span>
            <span className="hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1">
              <span>Per page:</span>
              <select
                aria-label="Items per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-6 text-xs bg-background border border-input rounded px-1.5 outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="h-7 px-2 gap-1"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="h-7 px-2 gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
