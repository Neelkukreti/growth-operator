'use client';

import { LeadState, STEP_ORDER } from '@/lib/types';
import clsx from 'clsx';
import {
  Building2, CheckCircle, Clock, AlertCircle, Loader2,
  ShieldCheck, ShieldX, Download, Mail, AlertTriangle,
} from 'lucide-react';

function StatusBadge({ status }: { status: 'researching' | 'composing' | 'verifying' | 'ready' | 'error' | 'pending' }) {
  const styles = {
    researching: 'bg-primary-light text-primary',
    composing: 'bg-info-light text-info',
    verifying: 'bg-warning-light text-warning',
    ready: 'bg-success-light text-success',
    error: 'bg-error-light text-error',
    pending: 'bg-background-secondary text-muted-light',
  };
  const labels = {
    researching: 'Researching',
    composing: 'Writing email',
    verifying: 'Verifying',
    ready: 'Ready',
    error: 'Failed',
    pending: 'Queued',
  };
  const icons = { researching: Loader2, composing: Loader2, verifying: Loader2, ready: CheckCircle, error: AlertCircle, pending: Clock };
  const Icon = icons[status];
  return (
    <span className={clsx('status-badge', styles[status])}>
      <Icon className={clsx('w-3 h-3', (status === 'researching' || status === 'composing' || status === 'verifying') && 'animate-spin')} />
      {labels[status]}
    </span>
  );
}

function getLeadStatus(lead: LeadState): 'researching' | 'composing' | 'verifying' | 'ready' | 'error' | 'pending' {
  if (lead.data.outreachStatus === 'ready') return 'ready';
  if (lead.steps.verify.status === 'active') return 'verifying';
  if (lead.data.emailBody && lead.steps.compose.status === 'done') return 'ready';
  if (STEP_ORDER.some((s) => lead.steps[s].status === 'error')) return 'error';
  if (lead.steps.compose.status === 'active') return 'composing';
  if (lead.steps.research.status === 'active') return 'researching';
  return 'pending';
}

function exportCSV(leads: LeadState[]) {
  const headers = [
    'Company', 'Website', 'Contact Name', 'Contact Email', 'Email Verified',
    'Description', 'Pain Points', 'Team Size', 'Tech Stack',
    'Email Subject', 'Email Body', 'Status', 'Data Quality',
  ];
  const rows = leads.map((l) => [
    l.data.companyName,
    l.data.companyUrl || '',
    l.data.contactName || '',
    l.data.contactEmail || '',
    l.steps.verify.status === 'done' ? (l.data.emailVerified ? 'Yes' : 'No') : '',
    l.data.description || '',
    (l.data.painPoints || []).join('; '),
    l.data.teamSize || '',
    (l.data.techStack || []).join(', '),
    l.data.emailSubject || '',
    l.data.emailBody || '',
    l.data.outreachStatus || getLeadStatus(l),
    l.data.dataQuality === 'fallback' ? 'Fallback (verify before sending)' : l.data.dataQuality === 'ai' ? 'AI-researched' : 'Pending',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'growth-operator-leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface LeadTableProps {
  leads: LeadState[];
  selectedId: string | null;
  onSelect: (lead: LeadState) => void;
}

export default function LeadTable({ leads, selectedId, onSelect }: LeadTableProps) {
  if (leads.length === 0) return null;

  const readyLeads = leads.filter((l) => l.data.outreachStatus === 'ready');
  const fallbackLeads = leads.filter((l) => l.data.dataQuality === 'fallback');
  const aiLeads = leads.filter((l) => l.data.dataQuality === 'ai');

  return (
    <div className="card overflow-hidden">
      {/* Table header */}
      <div className="px-4 py-3 border-b border-border bg-background-secondary flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-foreground">Leads</span>
          <span className="text-[11px] text-muted bg-white border border-border rounded-full px-2 py-0.5">
            {leads.length} found
          </span>
          {aiLeads.length > 0 && (
            <span className="text-[11px] text-success bg-success-light rounded-full px-2 py-0.5 font-medium">
              {aiLeads.length} AI-researched
            </span>
          )}
          {fallbackLeads.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-warning bg-warning-light rounded-full px-2 py-0.5 font-medium">
              <AlertTriangle className="w-3 h-3" />
              {fallbackLeads.length} fallback
            </span>
          )}
          {readyLeads.length > 0 && (
            <span className="text-[11px] text-primary bg-primary-light rounded-full px-2 py-0.5 font-medium">
              {readyLeads.length} ready
            </span>
          )}
        </div>
        {readyLeads.length > 0 && (
          <button
            onClick={() => exportCSV(leads)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-border text-muted hover:text-foreground hover:border-border-dark transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">Company</th>
              <th className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">Contact</th>
              <th className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">Email</th>
              <th className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">Description</th>
              <th className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">Pain Points</th>
              <th className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">Team</th>
              <th className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">Tech</th>
              <th className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const status = getLeadStatus(lead);
              const isSelected = selectedId === lead.id;

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelect(lead)}
                  className={clsx(
                    'border-b border-border-light cursor-pointer transition-colors',
                    isSelected ? 'bg-primary-light/40' : 'hover:bg-background-secondary',
                  )}
                >
                  {/* Company */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className={clsx(
                        'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                        lead.data.dataQuality === 'fallback' ? 'bg-warning-light' : 'bg-background-secondary',
                      )}>
                        {lead.data.dataQuality === 'fallback'
                          ? <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                          : <Building2 className="w-3.5 h-3.5 text-muted" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-[13px] font-medium text-foreground">{lead.data.companyName}</div>
                          {lead.data.dataQuality === 'fallback' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-light text-warning font-medium border border-warning/20">
                              Fallback
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-light truncate max-w-[120px]">
                          {lead.data.companyUrl?.replace(/^https?:\/\/(www\.)?/, '')}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact name */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {lead.data.contactName ? (
                      <span className="text-[13px] text-foreground">{lead.data.contactName}</span>
                    ) : (
                      <span className="text-[11px] text-muted-light">—</span>
                    )}
                  </td>

                  {/* Email + verified */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {lead.data.contactEmail ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-muted shrink-0" />
                        <span className="text-[12px] text-primary font-mono">{lead.data.contactEmail}</span>
                        {lead.steps.verify.status === 'done' && (
                          lead.data.emailVerified
                            ? <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                            : <ShieldX className="w-3.5 h-3.5 text-muted-light shrink-0" />
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-light">—</span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 max-w-[200px]">
                    {lead.data.description ? (
                      <span className="text-[12px] text-muted line-clamp-2 leading-relaxed">
                        {lead.data.description}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-light">—</span>
                    )}
                  </td>

                  {/* Pain points */}
                  <td className="px-4 py-3 max-w-[180px]">
                    {lead.data.painPoints && lead.data.painPoints.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[12px] text-muted line-clamp-2 leading-snug">
                          {lead.data.painPoints[0]}
                        </span>
                        {lead.data.painPoints.length > 1 && (
                          <span className="text-[10px] text-muted-light">
                            +{lead.data.painPoints.length - 1} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-light">—</span>
                    )}
                  </td>

                  {/* Team size */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {lead.data.teamSize ? (
                      <span className="text-[12px] text-muted">{lead.data.teamSize}</span>
                    ) : (
                      <span className="text-[11px] text-muted-light">—</span>
                    )}
                  </td>

                  {/* Tech stack */}
                  <td className="px-4 py-3">
                    {lead.data.techStack && lead.data.techStack.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {lead.data.techStack.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-background-secondary text-muted border border-border-light whitespace-nowrap">
                            {t}
                          </span>
                        ))}
                        {lead.data.techStack.length > 3 && (
                          <span className="text-[10px] text-muted-light">+{lead.data.techStack.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-light">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
