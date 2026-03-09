import { NextRequest, NextResponse } from 'next/server';
import { LeadData } from '@/lib/types';
import { getComposePrompt } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  const { lead, query, productContext, emailSettings } = (await req.json()) as { lead: LeadData; query: string; productContext?: string; emailSettings?: { tone?: string; length?: string; senderName?: string } };

  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback if no Gemini key
  if (!apiKey) {
    const firstName = lead.contactName?.split(' ')[0] || 'there';
    return NextResponse.json({
      emailSubject: `Quick question about ${lead.companyName}`,
      emailBody: `Hi ${firstName},\n\nI came across ${lead.companyName} and was genuinely impressed by what you're building${lead.description ? ` — ${lead.description.split('.')[0].toLowerCase()}` : ''}.\n\n${lead.painPoints?.[0] ? `I noticed companies in your space often struggle with ${lead.painPoints[0].toLowerCase()}. ` : ''}We've been working on something that might be relevant.\n\nWould love to share a quick idea — no pitch, just a thought. Worth a conversation?\n\nBest,\nAlex`,
      personalizationHooks: [
        lead.description ? 'Company description from homepage' : 'Company name',
        ...(lead.painPoints?.[0] ? ['First pain point from research'] : []),
      ],
    });
  }

  const prompt = getComposePrompt(lead, query, productContext, emailSettings as import('@/lib/prompts').EmailSettings);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No text in Gemini response');
    }

    const parsed = JSON.parse(text);
    return NextResponse.json({
      emailSubject: parsed.emailSubject || `About ${lead.companyName}`,
      emailBody: parsed.emailBody || '',
      personalizationHooks: parsed.personalizationHooks || [],
    });
  } catch (err) {
    console.error('Compose error:', err);
    // Fallback
    return NextResponse.json({
      emailSubject: `Thought about ${lead.companyName}`,
      emailBody: `Hi ${lead.contactName?.split(' ')[0] || 'there'},\n\nI came across ${lead.companyName} and wanted to reach out.\n\nWould love to connect.\n\nBest,\nAlex`,
      personalizationHooks: ['Company name'],
    });
  }
}
