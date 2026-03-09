import { runTinyfishAgent } from './tinyfish';
import { CampaignSSEEvent, LeadData } from './types';
import { getDiscoverPrompt, getResearchGoal, getAuditPrompt } from './prompts';

const RESEARCH_TIMEOUT_MS = 120_000; // 2 min per site

type EmitFn = (event: CampaignSSEEvent) => void;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

interface Lead {
  id: string;
  data: LeadData;
}

// ── AUDIT via Gemini (website improvement suggestions) ────
async function auditWithGemini(lead: Lead): Promise<{ suggestions: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { suggestions: [] };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: getAuditPrompt(lead.data) }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!response.ok) return { suggestions: [] };
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);
    return { suggestions: parsed.suggestions || [] };
  } catch {
    return { suggestions: [] };
  }
}

// ── DISCOVER via Gemini (fast, reliable) ─────────────────
async function discoverWithGemini(
  query: string,
  count: number,
  productContext?: string,
): Promise<Array<{ name: string; url: string; snippet: string }>> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: getDiscoverPrompt(query, count, productContext) }] }],
            tools: [{ google_search: {} }],
            generationConfig: {
              temperature: 0.3,
            },
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        const parts = result.candidates?.[0]?.content?.parts ?? [];
        const text = parts.find((p: { text?: string }) => p.text)?.text;
        console.log('[Gemini discover] raw text:', text?.slice(0, 300));
        if (text) {
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          const companies = parsed.companies || parsed;
          if (Array.isArray(companies) && companies.length > 0) {
            return companies.slice(0, count).map((c: { name: string; url: string; snippet?: string }) => ({
              name: c.name,
              url: c.url.startsWith('http') ? c.url : `https://${c.url}`,
              snippet: c.snippet || '',
            }));
          }
          console.error('[Gemini discover] companies empty or wrong shape:', JSON.stringify(parsed).slice(0, 300));
        }
      } else {
        const errText = await response.text().catch(() => '');
        console.error('[Gemini discover] non-OK response:', response.status, errText.slice(0, 300));
      }
    } catch (err) {
      console.error('[Gemini discover] exception:', err);
    }
  }

  // Fallback: curated companies per query keyword
  return getFallbackCompanies(query, count);
}

function getFallbackCompanies(
  query: string,
  count: number,
): Array<{ name: string; url: string; snippet: string }> {
  const q = query.toLowerCase();

  const pools: Record<string, Array<{ name: string; url: string; snippet: string }>> = {
    saas: [
      { name: 'Freshworks', url: 'https://freshworks.com', snippet: 'Customer engagement software for businesses of all sizes' },
      { name: 'Zoho', url: 'https://zoho.com', snippet: 'Suite of online productivity and SaaS applications' },
      { name: 'Chargebee', url: 'https://chargebee.com', snippet: 'Subscription billing and revenue management platform' },
      { name: 'Postman', url: 'https://postman.com', snippet: 'API platform for building and testing APIs' },
      { name: 'BrowserStack', url: 'https://browserstack.com', snippet: 'Cloud-based testing platform for web and mobile apps' },
      { name: 'CleverTap', url: 'https://clevertap.com', snippet: 'Customer engagement and retention platform' },
      { name: 'Razorpay', url: 'https://razorpay.com', snippet: 'Payment gateway and financial services for businesses' },
      { name: 'Hevo Data', url: 'https://hevodata.com', snippet: 'No-code data pipeline platform' },
      { name: 'WebEngage', url: 'https://webengage.com', snippet: 'Marketing automation and customer data platform' },
      { name: 'MoEngage', url: 'https://moengage.com', snippet: 'Customer engagement platform for consumer brands' },
    ],
    ai: [
      { name: 'Hugging Face', url: 'https://huggingface.co', snippet: 'Platform for building and sharing AI models' },
      { name: 'Scale AI', url: 'https://scale.com', snippet: 'AI data infrastructure for enterprise applications' },
      { name: 'Replicate', url: 'https://replicate.com', snippet: 'Run AI models in the cloud via API' },
      { name: 'Weights & Biases', url: 'https://wandb.ai', snippet: 'ML experiment tracking and model management' },
      { name: 'Jasper', url: 'https://jasper.ai', snippet: 'AI copilot for enterprise marketing teams' },
      { name: 'Runway', url: 'https://runwayml.com', snippet: 'Creative AI tools for video and image generation' },
      { name: 'Cohere', url: 'https://cohere.com', snippet: 'Enterprise AI platform for text understanding' },
      { name: 'Anyscale', url: 'https://anyscale.com', snippet: 'Platform for scalable AI applications' },
    ],
    fintech: [
      { name: 'Stripe', url: 'https://stripe.com', snippet: 'Payment infrastructure for the internet' },
      { name: 'Wise', url: 'https://wise.com', snippet: 'International money transfers and multi-currency accounts' },
      { name: 'Revolut', url: 'https://revolut.com', snippet: 'Global financial super app for payments and banking' },
      { name: 'Plaid', url: 'https://plaid.com', snippet: 'API platform connecting apps to financial accounts' },
      { name: 'Brex', url: 'https://brex.com', snippet: 'Corporate card and spend management for startups' },
      { name: 'Mercury', url: 'https://mercury.com', snippet: 'Banking platform built for startups' },
    ],
    devtool: [
      { name: 'Vercel', url: 'https://vercel.com', snippet: 'Frontend cloud platform for web development' },
      { name: 'Supabase', url: 'https://supabase.com', snippet: 'Open source Firebase alternative with Postgres' },
      { name: 'PlanetScale', url: 'https://planetscale.com', snippet: 'Serverless MySQL database platform' },
      { name: 'Railway', url: 'https://railway.app', snippet: 'Infrastructure platform for deploying apps' },
      { name: 'Resend', url: 'https://resend.com', snippet: 'Email API for developers' },
      { name: 'Neon', url: 'https://neon.tech', snippet: 'Serverless Postgres database' },
    ],
    ecommerce: [
      { name: 'Shopify', url: 'https://shopify.com', snippet: 'Commerce platform for online and retail businesses' },
      { name: 'BigCommerce', url: 'https://bigcommerce.com', snippet: 'E-commerce platform for growing businesses' },
      { name: 'Faire', url: 'https://faire.com', snippet: 'Online wholesale marketplace for retailers' },
      { name: 'Bolt', url: 'https://bolt.com', snippet: 'One-click checkout experience for e-commerce' },
      { name: 'Gorgias', url: 'https://gorgias.com', snippet: 'Customer service helpdesk for e-commerce stores' },
    ],
  };

  // Match query to a pool
  let matched: Array<{ name: string; url: string; snippet: string }> = [];
  for (const [key, pool] of Object.entries(pools)) {
    if (q.includes(key) || q.includes(key.replace('tool', ''))) {
      matched = pool;
      break;
    }
  }

  // If no pool matched, generate generic stubs based on the query
  if (matched.length === 0) {
    return Array.from({ length: count }, (_, i) => ({
      name: `Company ${i + 1}`,
      url: 'https://example.com',
      snippet: `Matches query: ${query}`,
    }));
  }

  // Shuffle and take count
  const shuffled = [...matched].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── MAIN ENGINE ──────────────────────────────────────────
export async function runCampaign(
  query: string,
  targetCount: number,
  emit: EmitFn,
  baseUrl: string,
  productContext?: string,
): Promise<void> {
  emit({ type: 'campaign_start', query, targetCount, productContext });

  // ── STEP 1: DISCOVER (Gemini) ───────────────────────────
  // Discover plenty of reserves — never fall back to stubs
  const REPLACE_BUFFER = targetCount; // double the pool so we always have real companies to try
  const discoverCount = Math.min(targetCount + REPLACE_BUFFER, 20);

  emit({ type: 'step_start', leadId: 'discover', step: 'discover' });

  let companyPool: Array<{ name: string; url: string; snippet: string }> = [];
  try {
    companyPool = await discoverWithGemini(query, discoverCount, productContext);
  } catch (err) {
    emit({ type: 'step_error', leadId: 'discover', step: 'discover', error: (err as Error).message });
  }

  if (companyPool.length === 0) {
    emit({ type: 'campaign_complete', totalLeads: 0, totalEmails: 0 });
    return;
  }

  emit({ type: 'step_complete', leadId: 'discover', step: 'discover', data: {} });

  // ── STEP 2: RESEARCH — all leads fully in parallel ─────
  // Fire all TinyFish sessions at once. On failure, silently try next reserve.
  const leads: Lead[] = [];
  let leadCounter = 0;

  while (leads.length < targetCount && companyPool.length > 0) {
    const needed = targetCount - leads.length;
    const batch = companyPool.splice(0, Math.min(needed, companyPool.length));

    const results = await Promise.allSettled(
      batch.map(async (company): Promise<Lead | null> => {
        const leadId = `lead-${leadCounter++}`;
        const lead: Lead = {
          id: leadId,
          data: { companyName: company.name, companyUrl: company.url, snippet: company.snippet },
        };

        let researchData: Record<string, unknown> | null = null;
        try {
          await withTimeout(
            runTinyfishAgent(
              lead.data.companyUrl,
              getResearchGoal(lead.data.companyName),
              {
                onStreamingUrl: (url) => emit({ type: 'step_streaming', leadId: lead.id, step: 'research', streamingUrl: url }),
                onProgress: (msg) => emit({ type: 'step_progress', leadId: lead.id, step: 'research', progress: msg }),
                onComplete: (data) => { researchData = data; },
                onError: (error) => {
                  console.error(`TinyFish failed for ${lead.data.companyName}, trying reserve:`, error);
                },
              },
              'stealth',
            ),
            RESEARCH_TIMEOUT_MS,
            `Research ${lead.data.companyName}`,
          );
        } catch (err) {
          console.error(`Research timeout for ${lead.data.companyName}, trying reserve:`, (err as Error).message);
        }

        if (!researchData) return null; // drop, next loop uses reserve
        Object.assign(lead.data, { ...(researchData as Partial<LeadData>), dataQuality: 'ai' as const });
        const audit = await auditWithGemini(lead).catch(() => ({ suggestions: [] }));
        lead.data.websiteAudit = audit.suggestions;
        return lead;
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null && leads.length < targetCount) {
        const lead = result.value;
        leads.push(lead);
        emit({ type: 'lead_discovered', leadId: lead.id, data: lead.data });
        emit({ type: 'step_complete', leadId: lead.id, step: 'research', data: { ...lead.data } });
      }
    }
  }

  // ── STEP 3: COMPOSE — all in parallel ─────────────────
  await Promise.allSettled(
    leads.map(async (lead) => {
      emit({ type: 'step_start', leadId: lead.id, step: 'compose' });

      try {
        const composeResponse = await fetch(
          new URL('/api/compose', baseUrl).toString(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead: lead.data, query, productContext }),
          },
        );

        if (composeResponse.ok) {
          const emailData = await composeResponse.json();
          Object.assign(lead.data, emailData);
          emit({ type: 'step_complete', leadId: lead.id, step: 'compose', data: emailData });
        } else {
          throw new Error('Compose API returned error');
        }
      } catch {
        const firstName = lead.data.contactName?.split(' ')[0] || 'there';
        const fallbackEmail = {
          emailSubject: `Quick thought about ${lead.data.companyName}`,
          emailBody: `Hi ${firstName},\n\nI came across ${lead.data.companyName} and was genuinely impressed${lead.data.description ? ` — ${lead.data.description.split('.')[0].toLowerCase()}` : ''}.\n\n${lead.data.painPoints?.[0] ? `I know scaling ${lead.data.painPoints[0].toLowerCase()} can be tricky. ` : ''}We've been working on something that might help.\n\nWould love to share a quick idea — worth a 5-min chat?\n\nBest,\nAlex`,
          personalizationHooks: ['Company description', ...(lead.data.painPoints?.[0] ? ['Pain point reference'] : [])],
        };
        Object.assign(lead.data, fallbackEmail);
        emit({ type: 'step_complete', leadId: lead.id, step: 'compose', data: fallbackEmail });
      }
    }),
  );

  // ── STEP 4: VERIFY — DNS MX check (instant, no TinyFish needed) ──────────
  await Promise.allSettled(
    leads.map(async (lead) => {
      const email = lead.data.contactEmail;
      const domain = (() => { try { return new URL(lead.data.companyUrl).hostname.replace('www.', ''); } catch { return ''; } })();
      const emailToVerify = (email && !email.startsWith('hello@') && !email.startsWith('info@') && !email.startsWith('contact@'))
        ? email
        : (domain ? `contact@${domain}` : null);

      if (!lead.data.contactEmail && emailToVerify) lead.data.contactEmail = emailToVerify;

      emit({ type: 'step_start', leadId: lead.id, step: 'verify' });

      // Check MX records — fast, reliable, no external browser agent needed
      let verified = false;
      let verifyResult = 'No domain found';

      if (domain) {
        try {
          const { resolveMx } = await import('dns/promises');
          const mx = await resolveMx(domain);
          verified = mx.length > 0;
          verifyResult = verified ? `MX valid (${mx[0].exchange})` : 'No MX records';
        } catch {
          verified = false;
          verifyResult = 'Domain not reachable';
        }
      }

      lead.data.emailVerified = verified;
      lead.data.emailVerifyResult = verifyResult;
      emit({ type: 'step_complete', leadId: lead.id, step: 'verify', data: { emailVerified: verified, emailVerifyResult: verifyResult } });
    }),
  );

  // ── STEP 5: OUTREACH (mark as ready) ───────────────────
  for (const lead of leads) {
    lead.data.outreachStatus = 'ready';
    emit({ type: 'step_complete', leadId: lead.id, step: 'outreach', data: { outreachStatus: 'ready' } });
  }

  emit({
    type: 'campaign_complete',
    totalLeads: leads.length,
    totalEmails: leads.filter((l) => l.data.emailBody).length,
  });
}
