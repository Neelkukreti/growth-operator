'use client';

import { LeadState, STEP_ORDER } from '@/lib/types';
import {
  Building2, User, Mail, Copy, CheckCircle, ExternalLink,
  Sparkles, AlertCircle, X, ShieldCheck, ShieldX, TrendingUp,
  RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

type Tone = 'friendly' | 'professional' | 'direct' | 'bold';
type Length = 'short' | 'medium' | 'long';

interface EmailSettings {
  tone: Tone;
  length: Length;
  senderName: string;
}

interface LeadDetailPanelProps {
  lead: LeadState;
  onClose: () => void;
}

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: 'friendly', label: 'Friendly', desc: 'Warm & conversational' },
  { value: 'professional', label: 'Professional', desc: 'Formal & polished' },
  { value: 'direct', label: 'Direct', desc: 'No fluff, straight to value' },
  { value: 'bold', label: 'Bold', desc: 'Confident & assertive' },
];

const LENGTHS: { value: Length; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

export default function LeadDetailPanel({ lead, onClose }: LeadDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [settings, setSettings] = useState<EmailSettings>({
    tone: 'friendly',
    length: 'medium',
    senderName: 'Alex',
  });
  // Local override for regenerated emails
  const [localEmail, setLocalEmail] = useState<{
    subject: string; body: string; hooks: string[];
  } | null>(null);

  const displayEmail = localEmail ?? {
    subject: lead.data.emailSubject || '',
    body: lead.data.emailBody || '',
    hooks: lead.data.personalizationHooks || [],
  };

  const handleCopy = async () => {
    const text = `Subject: ${displayEmail.subject}\n\n${displayEmail.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoUrl = lead.data.contactEmail
    ? `mailto:${lead.data.contactEmail}?subject=${encodeURIComponent(displayEmail.subject)}&body=${encodeURIComponent(displayEmail.body)}`
    : undefined;

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: lead.data, query: '', emailSettings: settings }),
      });
      const data = await res.json();
      setLocalEmail({
        subject: data.emailSubject || displayEmail.subject,
        body: data.emailBody || displayEmail.body,
        hooks: data.personalizationHooks || [],
      });
    } catch {
      // Keep existing email on error
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="card h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-background-secondary flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-muted" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{lead.data.companyName}</h3>
            <a
              href={lead.data.companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              {lead.data.companyUrl?.replace(/^https?:\/\/(www\.)?/, '')}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-background-secondary flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Fallback data warning */}
        {lead.data.dataQuality === 'fallback' && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-warning-light border border-warning/25">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-warning">Research timed out — generic data</p>
              <p className="text-[11px] text-warning/80 mt-0.5 leading-relaxed">
                TinyFish couldn&apos;t fully research this company. The description, pain points, and contact may be auto-generated. Verify before sending.
              </p>
            </div>
          </div>
        )}

        {/* About */}
        {lead.data.description && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">About</h4>
            <p className="text-sm text-foreground leading-relaxed">{lead.data.description}</p>
          </div>
        )}

        {/* Pain Points */}
        {lead.data.painPoints && lead.data.painPoints.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Pain Points</h4>
            <div className="space-y-1.5">
              {lead.data.painPoints.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                  <span className="text-sm text-muted">{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(lead.data.contactName || lead.data.contactEmail) && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Contact</h4>
            <div className="space-y-1.5">
              {lead.data.contactName && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <User className="w-3.5 h-3.5 text-muted" />{lead.data.contactName}
                </div>
              )}
              {lead.data.contactEmail && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Mail className="w-3.5 h-3.5" />
                  {lead.data.contactEmail}
                  {lead.steps.verify.status === 'done' && (
                    lead.data.emailVerified
                      ? <ShieldCheck className="w-3.5 h-3.5 text-success ml-1" />
                      : <ShieldX className="w-3.5 h-3.5 text-muted-light ml-1" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Website Screenshot + Audit */}
        {(lead.data.websiteScreenshot || (lead.data.websiteAudit && lead.data.websiteAudit.length > 0)) && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Website Audit
            </h4>
            {lead.data.websiteScreenshot && (
              <div className="rounded-lg overflow-hidden border border-border mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background-secondary border-b border-border-light">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
                    <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                    <span className="w-2 h-2 rounded-full bg-[#28C840]" />
                  </div>
                  <span className="text-[10px] text-muted-light truncate flex-1 text-center">
                    {lead.data.companyUrl?.replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                </div>
                <img
                  src={lead.data.websiteScreenshot}
                  alt={`${lead.data.companyName} website`}
                  className="w-full object-cover"
                  style={{ maxHeight: 160 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            {lead.data.websiteAudit && lead.data.websiteAudit.length > 0 && (
              <div className="space-y-2">
                {lead.data.websiteAudit.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-muted leading-snug">
                    <span className="w-4 h-4 rounded-full bg-warning-light text-warning flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generated Email */}
        {displayEmail.body && (
          <div>
            {/* Email header row */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Personalized Email</h4>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-background-secondary text-muted hover:text-foreground transition-colors"
                >
                  Tune
                  {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button
                  onClick={handleCopy}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                    copied ? 'bg-success-light text-success' : 'bg-background-secondary text-muted hover:text-foreground',
                  )}
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                {mailtoUrl && (
                  <a
                    href={mailtoUrl}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Send
                  </a>
                )}
              </div>
            </div>

            {/* Inline settings panel */}
            {showSettings && (
              <div className="mb-3 p-3 rounded-lg border border-border bg-background-secondary space-y-3">
                {/* Tone */}
                <div>
                  <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Tone</div>
                  <div className="grid grid-cols-2 gap-1">
                    {TONES.map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => setSettings((s) => ({ ...s, tone: value }))}
                        className={clsx(
                          'px-2.5 py-1.5 rounded-md text-[11px] font-medium text-left transition-colors',
                          settings.tone === value
                            ? 'bg-primary text-white'
                            : 'bg-white text-muted border border-border hover:border-primary/30 hover:text-primary',
                        )}
                      >
                        <div className="font-semibold">{label}</div>
                        <div className={clsx('text-[10px] mt-0.5', settings.tone === value ? 'text-white/70' : 'text-muted-light')}>
                          {desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length + Sender */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Length</div>
                    <div className="flex gap-1">
                      {LENGTHS.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setSettings((s) => ({ ...s, length: value }))}
                          className={clsx(
                            'flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                            settings.length === value
                              ? 'bg-primary text-white'
                              : 'bg-white text-muted border border-border hover:text-primary',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Sign as</div>
                    <input
                      type="text"
                      value={settings.senderName}
                      onChange={(e) => setSettings((s) => ({ ...s, senderName: e.target.value }))}
                      placeholder="Your name"
                      className="w-full px-2.5 py-1.5 rounded-md text-[12px] bg-white border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Regenerate button */}
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5', isRegenerating && 'animate-spin')} />
                  {isRegenerating ? 'Regenerating...' : 'Regenerate Email'}
                </button>
              </div>
            )}

            {/* Email preview */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-background-secondary border-b border-border-light">
                <div className="text-[11px] text-muted mb-1">Subject</div>
                <div className="text-sm font-medium text-foreground">{displayEmail.subject}</div>
              </div>
              <div className={clsx('px-4 py-3 text-sm text-muted leading-relaxed whitespace-pre-line', isRegenerating && 'opacity-40')}>
                {displayEmail.body}
              </div>
            </div>

            {/* Personalization hooks + regenerated badge */}
            <div className="mt-2 flex items-start gap-2 flex-wrap">
              {localEmail && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5" />
                  Regenerated · {settings.tone}, {settings.length}
                </span>
              )}
              {displayEmail.hooks.map((h, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-info-light text-info font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Activity timeline */}
        <div>
          <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Activity</h4>
          <div className="space-y-2">
            {STEP_ORDER.map((step) => {
              const s = lead.steps[step];
              if (s.status === 'pending') return null;
              return (
                <div key={step} className="flex items-center gap-2.5">
                  {s.status === 'done' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : s.status === 'active' ? (
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                  )}
                  <span className="text-sm text-muted capitalize">{step}</span>
                  {s.completedAt && (
                    <span className="text-[10px] text-muted-light ml-auto font-mono">
                      {new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
