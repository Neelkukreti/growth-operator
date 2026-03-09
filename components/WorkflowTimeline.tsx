'use client';

import { CampaignState } from '@/lib/types';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

const STEPS = [
  { key: 'discover', label: 'Discover' },
  { key: 'research', label: 'Research' },
  { key: 'compose', label: 'Compose' },
  { key: 'verify', label: 'Verify' },
  { key: 'outreach', label: 'Outreach' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export default function WorkflowTimeline({ campaign }: { campaign: CampaignState }) {
  const total = campaign.leads.length;

  function getStepCounts(step: StepKey) {
    if (step === 'discover') {
      const done = campaign.status !== 'idle' && campaign.status !== 'running' ? total : total;
      const active = campaign.leads.some((l) => l.steps.discover?.status === 'active');
      const allDone = total > 0 && campaign.leads.every((l) => l.steps.discover?.status === 'done');
      return { done: allDone ? total : 0, active, allDone };
    }
    const done = campaign.leads.filter((l) => l.steps[step]?.status === 'done').length;
    const active = campaign.leads.some((l) => l.steps[step]?.status === 'active');
    const allDone = total > 0 && done === total;
    return { done, active, allDone };
  }

  // Special discover step: done when leads exist
  function getDiscoverState() {
    if (total > 0) return { done: total, active: false, allDone: true };
    const discoverActive = campaign.status === 'running';
    return { done: 0, active: discoverActive, allDone: false };
  }

  return (
    <div className="card px-4 py-4">
      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Pipeline</p>
      <div className="space-y-2.5">
        {STEPS.map(({ key, label }) => {
          const { done, active, allDone } = key === 'discover' ? getDiscoverState() : getStepCounts(key);
          const pending = !allDone && !active;

          return (
            <div key={key} className="flex items-center gap-2.5">
              {/* Icon */}
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {allDone ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : active ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-light" />
                )}
              </div>

              {/* Label + count */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[12px] font-medium ${allDone ? 'text-foreground' : active ? 'text-primary' : 'text-muted'}`}>
                    {label}
                  </span>
                  {total > 0 && (
                    <span className="text-[10px] text-muted tabular-nums">
                      {allDone ? `${total}/${total}` : active ? `${done}/${total}` : key === 'discover' ? '' : `${done}/${total}`}
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {total > 0 && (
                  <div className="h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-success' : active ? 'bg-primary' : 'bg-transparent'}`}
                      style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
