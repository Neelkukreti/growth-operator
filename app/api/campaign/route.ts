import { NextRequest } from 'next/server';
import { runCampaign } from '@/lib/campaign-engine';
import { CampaignSSEEvent } from '@/lib/types';

export const maxDuration = 300;

function sendSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, event: CampaignSSEEvent) {
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  } catch {
    // Controller may be closed
  }
}

export async function POST(req: NextRequest) {
  const { query, targetCount, productContext } = await req.json();
  const count = Math.min(Math.max(Number(targetCount) || 3, 1), 10);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: CampaignSSEEvent) => sendSSE(controller, encoder, event);

      try {
        await runCampaign(query, count, emit, req.url, productContext);
      } catch (err) {
        emit({
          type: 'campaign_complete',
          totalLeads: 0,
          totalEmails: 0,
        });
        console.error('Campaign error:', err);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
