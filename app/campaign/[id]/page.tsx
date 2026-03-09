'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import MetricsRow from '@/components/MetricsRow';
import LeadTable from '@/components/LeadTable';
import LeadDetailPanel from '@/components/LeadDetailPanel';
import ActivityFeed from '@/components/ActivityFeed';
import WorkflowTimeline from '@/components/WorkflowTimeline';
import BrowserViewer from '@/components/BrowserViewer';
import { useCampaign } from '@/hooks/use-campaign';
import { LeadState, CampaignState } from '@/lib/types';
import clsx from 'clsx';
import { ArrowLeft, StopCircle, CheckCircle2, Loader2, RotateCcw, Download } from 'lucide-react';
import Link from 'next/link';
import { loadSession } from '@/lib/session-storage';

function exportCSV(campaign: CampaignState) {
  const headers = ['Company', 'Website', 'Contact Name', 'Email', 'Verified', 'Subject', 'Body', 'Status'];
  const rows = campaign.leads.map((l) => [
    l.data.companyName,
    l.data.companyUrl,
    l.data.contactName ?? '',
    l.data.contactEmail ?? '',
    l.data.emailVerified ? 'Yes' : 'No',
    l.data.emailSubject ?? '',
    (l.data.emailBody ?? '').replace(/\n/g, ' '),
    l.data.outreachStatus ?? '',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `leads-${campaign.query.slice(0, 30).replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function CampaignDashboard() {
  const searchParams = useSearchParams();
  const params = useParams();
  const sessionId = params.id as string;
  const query = searchParams.get('q') || '';
  const targetCount = Number(searchParams.get('n')) || 3;
  const productContext = searchParams.get('product') || undefined;
  const [hasStarted, setHasStarted] = useState(false);
  const [showBrowser, setShowBrowser] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadState | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  const {
    campaign,
    isRunning,
    browserSessions,
    startCampaign,
    cancelCampaign,
    restoreSession,
  } = useCampaign();

  const handleRerun = useCallback(() => {
    setIsRestored(false);
    setHasStarted(false);
  }, []);

  useEffect(() => {
    if (hasStarted) return;
    // Check for saved session first
    const saved = loadSession(sessionId);
    if (saved && saved.status === 'complete' && saved.leads.length > 0) {
      restoreSession(saved);
      setIsRestored(true);
      setHasStarted(true);
      return;
    }
    if (query) {
      setHasStarted(true);
      startCampaign(query, targetCount, productContext);
    }
  }, [query, targetCount, hasStarted, startCampaign, sessionId, restoreSession]);

  // Keep selected lead in sync
  useEffect(() => {
    if (selectedLead) {
      const updated = campaign.leads.find((l) => l.id === selectedLead.id);
      if (updated) setSelectedLead(updated);
    }
  }, [campaign.leads, selectedLead]);

  return (
    <div className={clsx('min-h-screen bg-background-secondary', !showBrowser && 'hide-browser')}>
      <Header
        isRunning={isRunning}
        showBrowser={showBrowser}
        onToggleBrowser={() => setShowBrowser((s) => !s)}
      />

      {/* Campaign header bar */}
      <div className="bg-white border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-background-secondary transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-muted" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-foreground truncate">
                {campaign.query || query}
              </h1>
              <p className="text-[12px] text-muted">
                {campaign.targetCount || targetCount} leads targeted
                {campaign.status === 'complete' && (
                  <span className="text-success ml-2 font-medium">
                    Campaign complete
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {campaign.leads.length > 0 && (
              <button
                onClick={() => exportCSV(campaign)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-muted border border-border hover:text-foreground hover:bg-background-secondary transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
            {isRestored && (
              <button
                onClick={handleRerun}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-muted border border-border hover:text-foreground hover:bg-background-secondary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-run
              </button>
            )}
            {isRunning ? (
              <>
                <span className="flex items-center gap-2 text-[13px] text-primary font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </span>
                <button
                  onClick={cancelCampaign}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-error bg-error-light border border-error/20 hover:bg-error/10 transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Stop
                </button>
              </>
            ) : campaign.status === 'complete' ? (
              <span className="flex items-center gap-1.5 text-[13px] text-success font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {isRestored ? 'Saved session' : 'Complete'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        {/* Metrics */}
        <MetricsRow campaign={campaign} />

        {/* Zero-leads error state */}
        {campaign.status === 'complete' && campaign.leads.length === 0 && (
          <div className="rounded-xl border border-error/20 bg-error-light px-6 py-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
              <StopCircle className="w-4 h-4 text-error" />
            </div>
            <div>
              <p className="text-sm font-semibold text-error">No leads found</p>
              <p className="text-[12px] text-error/70 mt-1 leading-relaxed">
                The discover step returned no companies, or all TinyFish research attempts failed.
                Try a broader query like <strong>"SaaS startups in San Francisco"</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Live browser + Activity feed + Pipeline */}
        <div className="browser-section grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          <BrowserViewer sessions={browserSessions} isRunning={isRunning} />
          <div className="flex flex-col gap-4">
            <ActivityFeed campaign={campaign} isRunning={isRunning} />
            <WorkflowTimeline campaign={campaign} />
          </div>
        </div>

        {/* Main layout: Table + Detail panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <LeadTable
            leads={campaign.leads}
            selectedId={selectedLead?.id || null}
            onSelect={setSelectedLead}
          />

          {/* Right panel — selected lead detail */}
          <div className="hidden lg:block">
            <AnimatePresence mode="wait">
              {selectedLead ? (
                <motion.div
                  key={selectedLead.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="sticky top-20"
                >
                  <LeadDetailPanel
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card p-8 text-center sticky top-20"
                >
                  <div className="text-muted-light text-sm mb-1">No lead selected</div>
                  <div className="text-[12px] text-muted-light">Click a row to view details</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignPage() {
  return <CampaignDashboard />;
}
