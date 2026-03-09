const TINYFISH_ENDPOINT = 'https://agent.tinyfish.ai/v1/automation/run-sse';

export interface TinyfishCallbacks {
  onStreamingUrl?: (url: string) => void;
  onProgress?: (message: string) => void;
  onComplete?: (resultJson: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

export async function runTinyfishAgent(
  url: string,
  goal: string,
  callbacks?: TinyfishCallbacks,
  browserProfile: 'stealth' | 'lite' = 'stealth',
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    callbacks?.onError?.('TINYFISH_API_KEY not configured');
    return null;
  }

  const response = await fetch(TINYFISH_ENDPOINT, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, goal, browser_profile: browserProfile }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    callbacks?.onError?.(`TinyFish API error ${response.status}: ${text}`);
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks?.onError?.('No response body from TinyFish');
    return null;
  }

  const decoder = new TextDecoder();
  let result: Record<string, unknown> | null = null;
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'STREAMING_URL' && data.streamingUrl) {
            callbacks?.onStreamingUrl?.(data.streamingUrl);
          } else if (data.type === 'STEP') {
            callbacks?.onProgress?.(data.message ?? 'Working...');
          } else if (data.type === 'COMPLETE' && data.status === 'COMPLETED') {
            result = data.resultJson ?? data.result ?? null;
            callbacks?.onComplete?.(result!);
          } else if (data.type === 'COMPLETE' && data.status === 'FAILED') {
            callbacks?.onError?.(data.error ?? 'Agent failed');
          } else if (data.type === 'ERROR') {
            callbacks?.onError?.(data.error ?? data.message ?? 'Agent error');
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}
