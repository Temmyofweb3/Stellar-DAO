'use client';

/**
 * Direct browser → Horizon client.
 *
 * The dashboard's real-time feed subscribes to the Soroban events stream
 * straight from Horizon when the API service is unreachable, otherwise
 * to its own /api/events SSE relay.
 */
export const horizonBrowser = {
  sseUrl(contractId: string, apiBase: string): string {
    if (apiBase) return `${apiBase}/events?contract=${contractId}`;
    return `${process.env.NEXT_PUBLIC_HORIZON_URL ?? ''}/contracts/${contractId}/events`;
  },

  async subscribe(contractId: string, onEvent: (e: unknown) => void): Promise<() => void> {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const url = `${apiBase}/events`;
    const es = new EventSource(url);
    const handler = (msg: MessageEvent) => {
      try {
        onEvent(JSON.parse(msg.data));
      } catch {
        /* ignore */
      }
    };
    es.addEventListener('contract-event', handler as EventListener);
    es.addEventListener('warning', handler as EventListener);
    return () => es.close();
  },
};
