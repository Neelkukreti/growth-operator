'use client';

import { useEffect, useRef } from 'react';
import { CampaignState, LeadState, STEP_ORDER } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Mail, CheckCircle, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

interface FeedEntry {
  id: string;
  icon: React.ElementType;
  message: string;
  type: 'success' | 'action' | 'info';
  timestamp: number;
}

function generateFeed(campaign: CampaignState): FeedEntry[] {
  const entries: FeedEntry[] = [];

  if (campaign.status === 'running' && campaign.leads.length === 0) {
    entries.push({
      id: 'searching',
      icon: Search,
      message: `Searching for "${campaign.query}"...`,
      type: 'action',
      timestamp: campaign.startedAt,
    });
  }

  for (const lead of campaign.leads) {
    entries.push({
      id: `${lead.id}-found`,
      icon: Sparkles,
      message: `Found ${lead.data.companyName}`,
      type: 'success',
      timestamp: lead.steps.discover.completedAt || Date.now(),
    });

    if (lead.steps.research.status === 'active') {
      entries.push({
        id: `${lead.id}-researching`,
        icon: Globe,
        message: `Researching ${lead.data.companyName}...`,
        type: 'action',
        timestamp: lead.steps.research.startedAt || Date.now(),
      });
    }

    if (lead.steps.research.status === 'done' && lead.data.description) {
      entries.push({
        id: `${lead.id}-researched`,
        icon: Globe,
        message: `${lead.data.companyName} research complete`,
        type: 'success',
        timestamp: lead.steps.research.completedAt || Date.now(),
      });
    }

    if (lead.steps.compose.status === 'active') {
      entries.push({
        id: `${lead.id}-composing`,
        icon: Mail,
        message: `Writing email for ${lead.data.contactName || lead.data.companyName}...`,
        type: 'action',
        timestamp: lead.steps.compose.startedAt || Date.now(),
      });
    }

    if (lead.steps.compose.status === 'done' && lead.data.emailSubject) {
      entries.push({
        id: `${lead.id}-composed`,
        icon: Mail,
        message: `Email generated for ${lead.data.companyName}`,
        type: 'success',
        timestamp: lead.steps.compose.completedAt || Date.now(),
      });
    }

    if (lead.steps.verify.status === 'active') {
      entries.push({
        id: `${lead.id}-verifying`,
        icon: ShieldCheck,
        message: `Verifying email for ${lead.data.contactName || lead.data.companyName}...`,
        type: 'action',
        timestamp: lead.steps.verify.startedAt || Date.now(),
      });
    }

    if (lead.steps.verify.status === 'done') {
      const verified = lead.data.emailVerified;
      entries.push({
        id: `${lead.id}-verified`,
        icon: ShieldCheck,
        message: verified
          ? `Email verified ✓ — ${lead.data.companyName}`
          : `Email unverifiable — ${lead.data.companyName}`,
        type: verified ? 'success' : 'info',
        timestamp: lead.steps.verify.completedAt || Date.now(),
      });
    }

    if (lead.steps.outreach.status === 'done') {
      entries.push({
        id: `${lead.id}-ready`,
        icon: CheckCircle,
        message: `${lead.data.companyName} — ready to send`,
        type: 'success',
        timestamp: lead.steps.outreach.completedAt || Date.now(),
      });
    }

    // Errors
    for (const step of STEP_ORDER) {
      if (lead.steps[step].status === 'error') {
        entries.push({
          id: `${lead.id}-${step}-error`,
          icon: AlertCircle,
          message: `${lead.data.companyName} — ${step} failed`,
          type: 'info',
          timestamp: lead.steps[step].completedAt || Date.now(),
        });
      }
    }
  }

  return entries.sort((a, b) => a.timestamp - b.timestamp).slice(-15);
}

const typeStyles = {
  success: 'text-success',
  action: 'text-primary',
  info: 'text-muted',
};

export default function ActivityFeed({ campaign, isRunning }: { campaign: CampaignState; isRunning: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const entries = generateFeed(campaign);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground">Activity</span>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-[11px] text-success font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success live-dot" />
            Live
          </span>
        )}
      </div>

      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto p-4 space-y-2.5">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-light text-sm">
              Activity will appear here...
            </div>
          ) : (
            entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${typeStyles[entry.type]}`} />
                  <span className="text-sm text-foreground flex-1">{entry.message}</span>
                  <span className="text-[10px] text-muted-light font-mono shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {isRunning && entries.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-light">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
