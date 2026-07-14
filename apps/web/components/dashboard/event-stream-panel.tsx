'use client';

import { useEffect, useRef, useState } from 'react';

export const EventStreamPanel = ({
  contractId,
  placeholder = 'Waiting for contract events…',
}: {
  contractId: string;
  placeholder?: string;
}) => {
  const [events, setEvents] = useState<unknown[]>([]);
  const [connected, setConnected] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/events`,
    );
    es.onopen = () => setConnected(true);
    es.addEventListener('contract-event', (raw) => {
      try {
        const parsed = JSON.parse((raw as MessageEvent).data);
        const key = JSON.stringify(parsed);
        if (!seen.current.has(key)) {
          seen.current.add(key);
          setEvents((prev) => [parsed, ...prev].slice(0, 30));
        }
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [contractId]);

  return (
    <div className="glass-panel rounded-2xl border border-white/5">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-xs uppercase tracking-widest text-stellar-haze">
        <span>Horizon · {contractId.slice(0, 6)}…{contractId.slice(-4)}</span>
        <span className={`inline-flex items-center gap-2 ${connected ? 'text-emerald-400' : 'text-stellar-haze'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse-soft' : 'bg-stellar-haze/40'}`} />
          {connected ? 'streaming' : 'offline'}
        </span>
      </header>
      {events.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-stellar-haze">{placeholder}</div>
      ) : (
        <ul className="divide-y divide-white/5 text-xs">
          {events.map((event, idx) => (
            <li key={idx} className="bg-stellar-slate/40 px-4 py-3 mono text-stellar-cloud">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(event, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
