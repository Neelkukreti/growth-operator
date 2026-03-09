'use client';

import { Globe, Monitor, Loader2 } from 'lucide-react';

interface BrowserSession {
  leadId: string;
  url: string | null;
  label: string;
  type: 'searching' | 'live';
}

interface BrowserViewerProps {
  sessions: BrowserSession[];
  isRunning?: boolean;
}

function SessionPane({ session }: { session: BrowserSession }) {
  return (
    <div className="flex flex-col h-full">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background-secondary shrink-0">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-error/40" />
          <div className="w-2 h-2 rounded-full bg-warning/40" />
          <div className="w-2 h-2 rounded-full bg-success/40" />
        </div>
        <div className="flex-1 flex items-center gap-1.5 px-2 py-0.5 rounded bg-white text-[10px] text-muted border border-border-light min-w-0">
          {session.type === 'live' && session.url && (
            <span className="w-1.5 h-1.5 rounded-full bg-success live-dot shrink-0" />
          )}
          {session.type === 'searching' && (
            <Loader2 className="w-2.5 h-2.5 text-primary animate-spin shrink-0" />
          )}
          <Globe className="w-2.5 h-2.5 text-muted-light shrink-0" />
          <span className="truncate">{session.label}</span>
        </div>
        {session.type === 'live' && session.url && (
          <span className="text-[9px] font-medium text-success shrink-0">● Live</span>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {session.url ? (
          <iframe
            src={session.url}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            title={session.label}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 bg-background-secondary">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-border">
                <Globe className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-[11px] text-muted font-medium text-center px-4">{session.label}</p>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-light border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary live-dot" />
              <span className="text-[10px] text-primary font-medium">Waiting for browser</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getGridCols(n: number): number {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 2;
  return 3; // 5–10: 3 columns
}

function getRowHeight(n: number): number {
  if (n <= 2) return 380;
  if (n === 3) return 340;
  return 260; // 4+ leads: shorter rows so all fit
}

export default function BrowserViewer({ sessions, isRunning }: BrowserViewerProps) {
  if (sessions.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-background-secondary">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-error/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-1 rounded-md bg-white text-[11px] text-muted border border-border-light">
            <Globe className="w-3 h-3 text-muted-light" />
            <span className="text-muted-light">Waiting for agent...</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-[360px] gap-4 bg-background-secondary">
          {isRunning ? (
            <>
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center border border-border">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-foreground font-medium">Agent connecting...</p>
                <p className="text-[12px] text-muted mt-1">Browser stream appears when TinyFish starts</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center border border-border">
                <Monitor className="w-6 h-6 text-muted-light" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted font-medium">Live Browser Feed</p>
                <p className="text-[12px] text-muted-light mt-0.5">Agent navigates websites in real-time</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const cols = getGridCols(sessions.length);
  const rowHeight = getRowHeight(sessions.length);
  const rows = Math.ceil(sessions.length / cols);
  const totalHeight = rows * rowHeight;

  return (
    <div className="card overflow-hidden">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          height: `${totalHeight}px`,
          gridAutoRows: `${rowHeight}px`,
        }}
      >
        {sessions.map((session, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          return (
            <div
              key={session.leadId}
              style={{
                borderLeft: col > 0 ? '1px solid var(--border)' : undefined,
                borderTop: row > 0 ? '1px solid var(--border)' : undefined,
              }}
            >
              <SessionPane session={session} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
