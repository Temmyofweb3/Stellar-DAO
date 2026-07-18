'use client';

import { useEffect, useState } from 'react';

import { WalletConnector } from '@/lib/wallet';
import { ChainBadge } from '@/components/atoms/chain-badge';

export const WalletConnect = () => {
  const [pubKey, setPubKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    WalletConnector.getPublicKey().then(setPubKey).catch(() => setPubKey(null));
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      const result = await WalletConnector.connect();
      setPubKey(result.pubKey);
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) {
    return <div className="h-9 w-32 animate-pulse rounded-full bg-white/5" />;
  }

  if (pubKey) {
    return (
      <div className="flex items-center gap-3">
        <span className="mono hidden text-xs text-stellar-haze sm:inline">
          {pubKey.slice(0, 4)}…{pubKey.slice(-4)}
        </span>
        <ChainBadge chain="stellar" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={busy}
      className="focus-ring inline-flex items-center gap-2 rounded-full border border-stellar-aurora/40 bg-gradient-to-br from-stellar-aurora/15 to-transparent px-4 py-2 text-sm font-medium text-white shadow-card transition hover:from-stellar-aurora/30 hover:to-stellar-nova/10 disabled:opacity-60"
    >
      {busy ? 'Connecting…' : 'Connect wallet'}
    </button>
  );
};
