'use client';

import { Zap, Monitor, MonitorOff } from 'lucide-react';
import clsx from 'clsx';

interface HeaderProps {
  isRunning?: boolean;
  showBrowser?: boolean;
  onToggleBrowser?: () => void;
}

export default function Header({ isRunning, showBrowser = true, onToggleBrowser }: HeaderProps) {
  return (
    <header className="border-b border-border bg-white sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[15px] text-foreground">Growth Operator</span>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-success bg-success-light px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success live-dot" />
              Running
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {onToggleBrowser && (
            <button
              onClick={onToggleBrowser}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                showBrowser
                  ? 'text-muted-light hover:text-muted border border-border hover:border-border'
                  : 'bg-info-light text-info border border-info/20',
              )}
            >
              {showBrowser ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              {showBrowser ? 'Hide Browser' : 'Show Browser'}
            </button>
          )}
          <span className="text-[11px] text-muted-light">
            Powered by TinyFish + Gemini
          </span>
        </div>
      </div>
    </header>
  );
}
