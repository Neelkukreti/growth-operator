'use client';

import { useState, useCallback, useRef } from 'react';
import {
  CampaignState,
  CampaignSSEEvent,
  LeadState,
  LeadStep,
  LogEntry,
  LeadData,
  createInitialSteps,
} from '@/lib/types';
import { saveSession } from '@/lib/session-storage';

function addLog(prev: LogEntry[], message: string, type: LogEntry['type'] = 'info'): LogEntry[] {
  return [...prev, { timestamp: Date.now(), message, type }];
}

export function useCampaign() {
  const [campaign, setCampaign] = useState<CampaignState>({
    status: 'idle',
    query: '',
    targetCount: 0,
    leads: [],
    startedAt: 0,
    completedAt: null,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [browserSessions, setBrowserSessions] = useState<Array<{
    leadId: string; url: string | null; label: string; type: 'searching' | 'live';
  }>>([]);
  const abortRef = useRef<AbortController | null>(null);

  const updateLead = useCallback((leadId: string, updater: (lead: LeadState) => LeadState) => {
    setCampaign((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === leadId ? updater(l) : l)),
    }));
  }, []);

  const updateStep = useCallback(
    (leadId: string, step: LeadStep, updater: (prev: LeadState) => LeadState) => {
      updateLead(leadId, updater);
    },
    [updateLead],
  );

  const handleEvent = useCallback(
    (event: CampaignSSEEvent) => {
      switch (event.type) {
        case 'campaign_start':
          setCampaign((prev) => ({
            ...prev,
            status: 'running',
            query: event.query,
            targetCount: event.targetCount,
            productContext: event.productContext,
          }));
          break;

        case 'lead_discovered': {
          const newLead: LeadState = {
            id: event.leadId,
            currentStep: 'discover',
            data: event.data as LeadData,
            steps: createInitialSteps(),
          };
          newLead.steps.discover.status = 'done';
          newLead.steps.discover.completedAt = Date.now();
          newLead.steps.discover.logs = addLog([], `Discovered ${(event.data as LeadData).companyName}`, 'success');
          setCampaign((prev) => ({
            ...prev,
            leads: [...prev.leads, newLead],
          }));
          break;
        }

        case 'step_start':
          if (event.leadId === 'discover') {
            // Show Gemini searching animation in browser panel
            setBrowserSessions([{ leadId: 'discover', url: null, label: 'Searching with Gemini + Google...', type: 'searching' }]);
            break;
          }
          updateLead(event.leadId, (lead) => ({
            ...lead,
            currentStep: event.step,
            steps: {
              ...lead.steps,
              [event.step]: {
                ...lead.steps[event.step],
                status: 'active' as const,
                startedAt: Date.now(),
                logs: addLog(lead.steps[event.step].logs, `Starting ${event.step}...`, 'system'),
              },
            },
          }));
          break;

        case 'step_streaming':
          if (event.leadId === 'discover') {
            setBrowserSessions([{ leadId: 'discover', url: event.streamingUrl, label: 'Searching Google...', type: 'live' }]);
          } else {
            setCampaign((prev) => {
              const lead = prev.leads.find((l) => l.id === event.leadId);
              const label = lead
                ? (event.step === 'verify' ? `Verifying ${lead.data.companyName}` : `Researching ${lead.data.companyName}`)
                : event.leadId;
              setBrowserSessions((sessions) => {
                const filtered = sessions.filter((s) => s.leadId !== 'discover' && s.leadId !== event.leadId);
                return [...filtered, { leadId: event.leadId, url: event.streamingUrl, label, type: 'live' as const }];
              });
              return prev;
            });
            updateLead(event.leadId, (lead) => ({
              ...lead,
              steps: {
                ...lead.steps,
                [event.step]: { ...lead.steps[event.step], streamingUrl: event.streamingUrl },
              },
            }));
          }
          break;

        case 'step_progress':
          if (event.leadId === 'discover') break;
          updateLead(event.leadId, (lead) => ({
            ...lead,
            steps: {
              ...lead.steps,
              [event.step]: {
                ...lead.steps[event.step],
                progress: event.progress,
                logs: addLog(lead.steps[event.step].logs, event.progress, 'info'),
              },
            },
          }));
          break;

        case 'step_complete':
          if (event.leadId === 'discover') {
            setBrowserSessions([]); // Clear discover session when done
            break;
          }
          // Remove this lead's browser session when research/verify completes
          setBrowserSessions((sessions) => sessions.filter((s) => s.leadId !== event.leadId));
          updateLead(event.leadId, (lead) => ({
            ...lead,
            currentStep: event.step,
            data: { ...lead.data, ...event.data },
            steps: {
              ...lead.steps,
              [event.step]: {
                ...lead.steps[event.step],
                status: 'done' as const,
                completedAt: Date.now(),
                logs: addLog(
                  lead.steps[event.step].logs,
                  `${event.step} complete`,
                  'success',
                ),
              },
            },
          }));
          break;

        case 'step_error':
          if (event.leadId === 'discover') break;
          updateLead(event.leadId, (lead) => ({
            ...lead,
            steps: {
              ...lead.steps,
              [event.step]: {
                ...lead.steps[event.step],
                status: 'error' as const,
                error: event.error,
                completedAt: Date.now(),
                logs: addLog(lead.steps[event.step].logs, event.error, 'error'),
              },
            },
          }));
          break;

        case 'campaign_complete':
          setCampaign((prev) => {
            const completed = { ...prev, status: 'complete' as const, completedAt: Date.now() };
            if (typeof window !== 'undefined') {
              const id = window.location.pathname.split('/').pop() || '';
              if (id) saveSession(id, completed);
            }
            return completed;
          });
          setBrowserSessions([]);
          setIsRunning(false);
          break;
      }
    },
    [updateLead],
  );

  const startCampaign = useCallback(
    async (query: string, targetCount: number, productContext?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsRunning(true);
      setBrowserSessions([]);
      setCampaign({
        status: 'running',
        query,
        targetCount,
        productContext,
        leads: [],
        startedAt: Date.now(),
        completedAt: null,
      });

      try {
        const response = await fetch('/api/campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, targetCount, productContext }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setIsRunning(false);
          setCampaign((prev) => ({ ...prev, status: 'error' }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event: CampaignSSEEvent = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch {
              // Skip malformed
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Campaign SSE error:', err);
          setCampaign((prev) => ({ ...prev, status: 'error' }));
        }
      } finally {
        setIsRunning(false);
      }
    },
    [handleEvent],
  );

  const cancelCampaign = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
    setCampaign((prev) => ({ ...prev, status: 'complete', completedAt: Date.now() }));
  }, []);

  const restoreSession = useCallback((saved: CampaignState) => {
    setCampaign(saved);
    setIsRunning(false);
    setBrowserSessions([]);
  }, []);

  return {
    campaign,
    isRunning,
    browserSessions,
    startCampaign,
    cancelCampaign,
    restoreSession,
  };
}
