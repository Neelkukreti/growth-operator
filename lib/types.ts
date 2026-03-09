export type LeadStep = 'discover' | 'research' | 'compose' | 'verify' | 'outreach';
export type StepStatus = 'pending' | 'active' | 'done' | 'error' | 'skipped';

export const STEP_ORDER: LeadStep[] = ['discover', 'research', 'compose', 'verify', 'outreach'];

export const STEP_LABELS: Record<LeadStep, string> = {
  discover: 'Discover',
  research: 'Research',
  compose: 'Compose',
  verify: 'Verify',
  outreach: 'Outreach',
};

export const STEP_ICONS: Record<LeadStep, string> = {
  discover: 'Search',
  research: 'Globe',
  compose: 'PenTool',
  verify: 'ShieldCheck',
  outreach: 'Send',
};

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'system';
}

export interface LeadData {
  // DISCOVER
  companyName: string;
  companyUrl: string;
  snippet?: string;

  // RESEARCH
  description?: string;
  painPoints?: string[];
  techStack?: string[];
  teamSize?: string;
  contactName?: string;
  contactEmail?: string;
  recentNews?: string;

  // COMPOSE
  emailSubject?: string;
  emailBody?: string;
  personalizationHooks?: string[];

  // VERIFY
  emailVerified?: boolean;
  emailVerifyResult?: string;

  // AUDIT
  websiteScreenshot?: string;  // mshots URL
  websiteAudit?: string[];     // 3 improvement suggestions

  // DATA QUALITY
  dataQuality?: 'ai' | 'fallback'; // 'ai' = TinyFish researched, 'fallback' = timed out / generic

  // OUTREACH
  outreachStatus?: 'drafted' | 'ready';
}

export interface StepState {
  step: LeadStep;
  status: StepStatus;
  streamingUrl: string | null;
  progress: string;
  logs: LogEntry[];
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

export interface LeadState {
  id: string;
  currentStep: LeadStep;
  data: LeadData;
  steps: Record<LeadStep, StepState>;
}

export type CampaignStatus = 'idle' | 'running' | 'complete' | 'error';

export interface CampaignState {
  status: CampaignStatus;
  query: string;
  targetCount: number;
  productContext?: string;
  leads: LeadState[];
  startedAt: number;
  completedAt: number | null;
}

export type CampaignSSEEvent =
  | { type: 'campaign_start'; query: string; targetCount: number; productContext?: string }
  | { type: 'lead_discovered'; leadId: string; data: Partial<LeadData> }
  | { type: 'step_start'; leadId: string; step: LeadStep }
  | { type: 'step_streaming'; leadId: string; step: LeadStep; streamingUrl: string }
  | { type: 'step_progress'; leadId: string; step: LeadStep; progress: string }
  | { type: 'step_complete'; leadId: string; step: LeadStep; data: Partial<LeadData> }
  | { type: 'step_error'; leadId: string; step: LeadStep; error: string }
  | { type: 'campaign_complete'; totalLeads: number; totalEmails: number };

export function createInitialStepState(step: LeadStep): StepState {
  return {
    step,
    status: 'pending',
    streamingUrl: null,
    progress: '',
    logs: [],
    startedAt: 0,
    completedAt: null,
    error: null,
  };
}

export function createInitialSteps(): Record<LeadStep, StepState> {
  return {
    discover: createInitialStepState('discover'),
    research: createInitialStepState('research'),
    compose: createInitialStepState('compose'),
    verify: createInitialStepState('verify'),
    outreach: createInitialStepState('outreach'),
  };
}
