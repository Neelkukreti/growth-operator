import { NextRequest, NextResponse } from 'next/server';
import { getQueryFromProductPrompt } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  const { productDescription } = await req.json();
  if (!productDescription?.trim()) {
    return NextResponse.json({ error: 'productDescription is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback: use the description as the query directly
    return NextResponse.json({
      query: productDescription.slice(0, 100),
      targetDescription: 'Companies that could benefit from your product.',
      productSummary: productDescription,
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: getQueryFromProductPrompt(productDescription) }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!response.ok) throw new Error('Gemini API error');

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');

    const parsed = JSON.parse(text);
    return NextResponse.json({
      query: parsed.query || productDescription,
      targetDescription: parsed.targetDescription || '',
      productSummary: parsed.productSummary || productDescription,
    });
  } catch (err) {
    console.error('expand-product error:', err);
    return NextResponse.json({
      query: productDescription.slice(0, 100),
      targetDescription: 'Companies that could benefit from your product.',
      productSummary: productDescription,
    });
  }
}
