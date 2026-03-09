export function getDiscoverPrompt(query: string, count: number, productContext?: string): string {
  const productHint = productContext
    ? `\n\nIMPORTANT: The seller's product is: "${productContext}". Prioritize companies that would most benefit from this.`
    : '';
  return `Search the web and find ${count} REAL businesses matching this query: "${query}"${productHint}

CRITICAL GEOGRAPHIC RULE: If the query mentions a specific city or country, EVERY result MUST be physically located there. Do NOT substitute businesses from other cities or countries. For example, if the query says "Bangalore", all results must be in Bangalore, India — not Malaysia, Singapore, or anywhere else.

Return JSON with this exact structure:
{
  "companies": [
    { "name": "Business Name", "url": "https://actual-website.com", "snippet": "One sentence describing what they do or offer" }
  ]
}

Rules:
- Must be REAL, currently operating businesses in the location specified
- URLs must be the business's OWN standalone website (NOT LinkedIn, Yelp, Crunchbase, Google Maps, Zomato, TripAdvisor, hotel chain pages, or any aggregator/directory site)
- If the business is a restaurant inside a hotel, use the hotel chain's main site only if no independent URL exists
- Prefer businesses that have their own domain (e.g. thefattybao.com, not itchotels.com/...)
- Snippet must be specific: what they actually do, sell, or offer
- Return ONLY valid JSON, no markdown or explanation
- Return exactly ${count} entries`;
}

export function getQueryFromProductPrompt(productDescription: string): string {
  return `You are a B2B sales targeting expert. A founder has described their product:

"${productDescription}"

Your job:
1. Identify who their IDEAL customer is (what type of company, industry, size, stage)
2. Generate a clear search query to find those companies (e.g., "E-commerce stores in the US", "Series A SaaS startups", "Mid-size fintech companies")
3. Write a short positioning note explaining why these companies need this product

Return JSON:
{
  "query": "search query for ideal customers",
  "targetDescription": "2-sentence explanation of who this targets and why",
  "productSummary": "One-line summary of what the product does and its key value prop"
}

Return ONLY valid JSON.`;
}

export function getResearchGoal(companyName: string): string {
  return `
You are on the website for "${companyName}". Research this business.

Steps:
1. Read the homepage to understand what they do or offer
2. Look for an About, Team, or Contact page
3. Check one more page (Menu, Services, Pricing, or Blog)

Navigate at most 3 pages total.

Return JSON — fill in what you find, use null for anything not available:
{
  "description": "2-3 sentence description of what this business does, sells, or offers",
  "painPoints": ["challenge or need this business likely has", "another challenge", "another"],
  "techStack": ["any technology or platform they use, or empty array"],
  "teamSize": "solo / small / medium / large",
  "contactName": "Name of owner, chef, founder, or key person if found, or null",
  "contactEmail": "Any public email address found, or null",
  "recentNews": "Latest blog post title, news, or promotion if found, or null"
}

IMPORTANT: Always return valid JSON with all fields, even if values are null. Never return an error or refuse.
Return ONLY valid JSON.
`.trim();
}

export interface EmailSettings {
  tone?: 'friendly' | 'professional' | 'direct' | 'bold';
  length?: 'short' | 'medium' | 'long';
  senderName?: string;
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  friendly: 'Warm and conversational. Use casual language, be personable, build rapport.',
  professional: 'Formal and polished. Business-appropriate language, structured, credibility-focused.',
  direct: 'No fluff. Get to the point immediately. Value proposition in the first sentence.',
  bold: 'Confident and assertive. Strong opener, make a clear claim, provocative subject line.',
};

const LENGTH_RULES: Record<string, string> = {
  short: '3-4 sentences max. One clear idea.',
  medium: '4-6 sentences. Opener + pain point + value + CTA.',
  long: '6-9 sentences. Detailed personalization, more context, stronger case.',
};

export function getComposePrompt(lead: {
  companyName: string;
  companyUrl: string;
  description?: string;
  painPoints?: string[];
  techStack?: string[];
  contactName?: string;
  recentNews?: string;
}, campaignQuery: string, productContext?: string, settings?: EmailSettings): string {
  const tone = settings?.tone || 'friendly';
  const length = settings?.length || 'medium';
  const senderName = settings?.senderName || 'Alex';

  const sellerSection = productContext
    ? `\nSELLER'S PRODUCT: ${productContext}\nWrite the email FROM the seller's perspective — they are reaching out because their product solves the target's pain points.`
    : '\nWrite a general outreach email introducing the sender as someone with a relevant solution.';

  return `You are an expert cold email copywriter. Write a personalized cold email.

TARGET: ${lead.companyName} (${lead.companyUrl})
WHAT THEY DO: ${lead.description || 'Unknown'}
PAIN POINTS: ${JSON.stringify(lead.painPoints || [])}
CONTACT: ${lead.contactName || 'the team'}
RECENT NEWS: ${lead.recentNews || 'None'}
CAMPAIGN: "${campaignQuery}"
${sellerSection}

TONE: ${TONE_DESCRIPTIONS[tone]}
LENGTH: ${LENGTH_RULES[length]}
SIGN OFF AS: ${senderName}

Return JSON:
{
  "emailSubject": "Subject line under 60 chars",
  "emailBody": "Full email body including greeting and sign-off signed as ${senderName}",
  "personalizationHooks": ["what you personalized"]
}

Rules:
- Open with something specific about THEIR company
- Reference a concrete pain point
- Sound human, not salesy
- Apply the tone and length exactly as specified
- Sign off as ${senderName}
- Return ONLY valid JSON`;
}

export function getAuditPrompt(lead: {
  companyName: string;
  companyUrl: string;
  description?: string;
  painPoints?: string[];
  techStack?: string[];
}): string {
  return `You are a B2B website conversion expert. Analyze this company and suggest 3 specific, actionable improvements to their website that would help them convert more B2B customers.

COMPANY: ${lead.companyName}
WEBSITE: ${lead.companyUrl}
WHAT THEY DO: ${lead.description || 'Unknown'}
KNOWN PAIN POINTS: ${JSON.stringify(lead.painPoints || [])}
TECH STACK: ${JSON.stringify(lead.techStack || [])}

Return JSON:
{
  "suggestions": [
    "Specific improvement #1 (e.g. 'Add a case study section with ROI metrics — B2B buyers need social proof')",
    "Specific improvement #2",
    "Specific improvement #3"
  ]
}

Rules:
- Suggestions must be SPECIFIC to this company, not generic
- Focus on B2B conversion: trust signals, pricing clarity, social proof, CTAs
- Reference their actual product/use case in each suggestion
- Return ONLY valid JSON`;
}

export function getVerifyEmailGoal(email: string, companyName: string): string {
  return `
You are on an email verification website. Verify this email address: "${email}" for ${companyName}.

Steps:
1. Find the email input field on the page
2. Type the email address: ${email}
3. Click the "Verify" or "Check" button
4. Wait for the result to appear
5. Read the verification result

Return JSON:
{
  "verified": true or false,
  "result": "The verification result text from the page",
  "deliverable": true or false
}

Return ONLY valid JSON.
`.trim();
}
