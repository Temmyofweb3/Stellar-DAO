'use client';

import { useMemo, useState } from 'react';

import { StatusDot } from '@stellardao/ui';
import { ChainBadge } from '@/components/atoms/chain-badge';
import { SOURCE_CHAINS, type Transaction, type TxStatus } from '@stellardao/shared';

const statusFilters: TxStatus[] = ['pending', 'attesting', 'minting', 'completed', 'failed', 'refunded'];

export const TransactionsPanel = ({
  initial,
  chainFilter,
  typeFilter,
}: {
  initial: Transaction[];
  chainFilter?: string;
  typeFilter?: string;
}) => {
  const [chain, setChain] = useState(chainFilter ?? 'all');
  const [type, setType] = useState(typeFilter ?? 'all');
  const [status, setStatus] = useState<TxStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return initial.filter((tx) => {
      if (chain !== 'all' && tx.sourceChain !== chain) return false;
      if (type !== 'all' && tx.type !== type) return false;
      if (status !== 'all' && tx.status !== status) return false;
      if (search && !tx.id.includes(search) && !tx.sourceToken.includes(search)) return false;
      return true;
    });
  }, [initial, chain, type, status, search]);

  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl p-3 text-xs">
        <input
          type="search"
          placeholder="Search by id / token / nonce"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="focus-ring flex-1 rounded-lg border border-white/10 bg-stellar-ink/40 px-3 py-1.5 text-stellar-cloud placeholder:text-stellar-haze"
        />
        <div className="flex flex-wrap gap-1">
          <FilterChip active={chain === 'all'} onClick={() => setChain('all')} label="All chains" />
          {SOURCE_CHAINS.map((c) => (
            <FilterChip key={c} active={chain === c} onClick={() => setChain(c)} label={c} />
          ))}
        </div>
        <div className="flex gap-1">
          <FilterChip active={type === 'all'} onClick={() => setType('all')} label="wrap+unwrap" />
          <FilterChip active={type === 'wrap'} onClick={() => setType('wrap')} label="wrap" />
          <FilterChip active={type === 'unwrap'} onClick={() => setType('unwrap')} label="unwrap" />
        </div>
        <div className="flex flex-wrap gap-1">
          <FilterChip active={status === 'all'} onClick={() => setStatus('all')} label="any status" />
          {statusFilters.map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)} label={s} />
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-stellar-haze">
            No matching transactions.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-stellar-haze">
              <tr>
                <th className="px-5 py-3">Tx</th>
                <th className="px-5 py-3">Chain</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Recipient</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((tx) => (
                <tr key={tx.id} className="bg-stellar-slate/40 transition hover:bg-stellar-slate/60">
                  <td className="mono px-5 py-3 text-xs text-stellar-cloud">{tx.id}</td>
                  <td className="px-5 py-3"><ChainBadge chain={tx.sourceChain} /></td>
                  <td className="mono px-5 py-3 text-xs text-stellar-cloud">{tx.amount}</td>
                  <td className="mono truncate px-5 py-3 text-xs text-stellar-haze">{tx.recipient}</td>
                  <td className="px-5 py-3"><StatusDot status={tx.status} /></td>
                  <td className="px-5 py-3 text-xs text-stellar-haze">{tx.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const FilterChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`focus-ring rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest transition ${
      active
        ? 'border-stellar-aurora/40 bg-stellar-aurora/15 text-white'
        : 'border-white/10 text-stellar-haze hover:border-white/20 hover:text-white'
    }`}
  >
    {label}
  </button>
);
