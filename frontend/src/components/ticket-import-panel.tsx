'use client';

import React, { useState } from 'react';
import { importTickets, ImportResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  RefreshCw,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  PlusCircle,
  Clock,
} from 'lucide-react';

const SAMPLE_TICKETS_FEED = {
  tickets: [
    {
      externalId: 'EXT-101',
      subject: 'Delivery delayed for order #49102',
      body: 'My package has not arrived yet, and tracking has not updated for 3 days.',
    },
    {
      externalId: 'EXT-102',
      subject: 'Duplicate charge on invoice',
      body: 'Please process a refund for invoice #INV-8821 as my credit card was charged twice.',
    },
    {
      externalId: 'EXT-103',
      subject: 'Locked out of system',
      body: 'Urgent: I am locked out due to 2FA verification code errors.',
    },
    {
      externalId: 'EXT-104',
      subject: 'Production down - 500 error',
      body: 'Critical crash: the main payment portal is throwing 500 exceptions.',
    },
    {
      externalId: 'EXT-105',
      subject: 'Request: Export to CSV feature',
      body: 'Would it be possible to add a button to export monthly logs to CSV?',
    },
  ],
};

interface TicketImportPanelProps {
  onImportSuccess?: (result: ImportResult) => void;
}

export function TicketImportPanel({ onImportSuccess }: TicketImportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_TICKETS_FEED, null, 2));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportResult | null>(null);

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(SAMPLE_TICKETS_FEED, null, 2));
    setErrorMsg(null);
    setImportSummary(null);
  };

  const handleClear = () => {
    setJsonText('{\n  "tickets": []\n}');
    setErrorMsg(null);
    setImportSummary(null);
  };

  const handleImport = async () => {
    setErrorMsg(null);
    setImportSummary(null);

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(jsonText);
    } catch {
      setErrorMsg('Invalid JSON format. Please verify syntax (curly braces, quotes, commas).');
      return;
    }

    if (!parsedPayload || !Array.isArray(parsedPayload.tickets)) {
      setErrorMsg('Payload must contain a "tickets" array (e.g. { "tickets": [...] }).');
      return;
    }

    if (parsedPayload.tickets.length === 0) {
      setErrorMsg('The "tickets" array is empty. Please provide at least one ticket to import.');
      return;
    }

    setIsLoading(true);

    const { result, error } = await importTickets(parsedPayload);
    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Import failed. Please check your token and payload.');
      return;
    }

    if (result) {
      setImportSummary(result);
      if (onImportSuccess) {
        onImportSuccess(result);
      }
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => {
          setIsOpen(true);
          setErrorMsg(null);
          setImportSummary(null);
        }}
        variant="default"
        size="sm"
        className="gap-2 shrink-0 cursor-pointer"
      >
        <Upload className="size-4" />
        <span>Import Feed</span>
      </Button>

      {/* Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl max-w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileCode className="size-5 text-primary" />
              <span>Import External Ticket Feed</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Batch import tickets with deterministic auto-triage (T-B1), idempotent re-import,
              and human-override protection (T-B2).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">JSON Feed Payload</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleLoadSample}
                  disabled={isLoading}
                  className="text-xs h-7 gap-1"
                >
                  <RefreshCw className="size-3" />
                  <span>Load Sample Feed</span>
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* JSON Textarea */}
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              disabled={isLoading}
              rows={9}
              className="font-mono text-xs w-full resize-y bg-muted/20 border-input leading-relaxed"
              placeholder='{\n  "tickets": [\n    {\n      "externalId": "EXT-1",\n      "subject": "...",\n      "body": "..."\n    }\n  ]\n}'
            />

            {/* Error Notification */}
            {errorMsg && (
              <Alert variant="destructive" className="border-destructive/50 py-2">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* Success Summary */}
            {importSummary && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Feed Import Complete</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-background/80 rounded-lg p-2 border border-border">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] uppercase font-semibold">
                      <PlusCircle className="size-3 text-emerald-600" />
                      <span>Imported</span>
                    </div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {importSummary.importedCount}
                    </div>
                  </div>

                  <div className="bg-background/80 rounded-lg p-2 border border-border">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] uppercase font-semibold">
                      <Clock className="size-3 text-blue-600" />
                      <span>Updated</span>
                    </div>
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {importSummary.updatedCount}
                    </div>
                  </div>

                  <div className="bg-background/80 rounded-lg p-2 border border-border">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] uppercase font-semibold">
                      <ShieldCheck className="size-3 text-amber-600" />
                      <span>Protected</span>
                    </div>
                    <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {importSummary.skippedOverrideCount}
                    </div>
                  </div>

                  <div className="bg-background/80 rounded-lg p-2 border border-border">
                    <div className="text-muted-foreground text-[10px] uppercase font-semibold">
                      Total
                    </div>
                    <div className="text-base font-bold text-foreground mt-0.5">
                      {importSummary.total}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t mt-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button
              onClick={handleImport}
              disabled={isLoading}
              size="sm"
              className="gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="size-3.5" />
                  <span>Execute Import</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
