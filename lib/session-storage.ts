import { CampaignState } from './types';

const INDEX_KEY = 'gop-sessions';
const SESSION_PREFIX = 'gop-session-';
const MAX_SESSIONS = 10;

export interface SessionMeta {
  id: string;
  query: string;
  targetCount: number;
  productContext?: string;
  completedAt: number;
  totalLeads: number;
  totalEmails: number;
}

export function saveSession(id: string, campaign: CampaignState): void {
  try {
    localStorage.setItem(`${SESSION_PREFIX}${id}`, JSON.stringify(campaign));
    const meta: SessionMeta = {
      id,
      query: campaign.query,
      targetCount: campaign.targetCount,
      productContext: campaign.productContext,
      completedAt: campaign.completedAt || Date.now(),
      totalLeads: campaign.leads.length,
      totalEmails: campaign.leads.filter((l) => !!l.data.emailBody).length,
    };
    const existing = getSessions().filter((s) => s.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify([meta, ...existing].slice(0, MAX_SESSIONS)));
  } catch { /* storage full */ }
}

export function loadSession(id: string): CampaignState | null {
  try {
    const raw = localStorage.getItem(`${SESSION_PREFIX}${id}`);
    return raw ? (JSON.parse(raw) as CampaignState) : null;
  } catch { return null; }
}

export function getSessions(): SessionMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as SessionMeta[]) : [];
  } catch { return []; }
}

export function deleteSession(id: string): void {
  try {
    localStorage.removeItem(`${SESSION_PREFIX}${id}`);
    localStorage.setItem(INDEX_KEY, JSON.stringify(getSessions().filter((s) => s.id !== id)));
  } catch { /* ignore */ }
}
