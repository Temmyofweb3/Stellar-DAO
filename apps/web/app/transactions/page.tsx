import type { Metadata } from 'next';

import { TransactionsPanel } from '@/components/dashboard/transactions-panel';
import { serverApi } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'Transactions · StellarDAO',
  description: 'Live wrap and unwrap transactions, streamed straight from Horizon.',
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const initial = await serverApi.listTransactions({ limit: 100 }).catch(() => ({ transactions: [] }));
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <span className="text-xs uppercase tracking-widest text-stellar-nova">Settlement</span>
        <h1 className="text-3xl font-semibold text-white">Every wrap & unwrap, indexed</h1>
        <p className="max-w-2xl text-sm text-stellar-haze">
          Each row is observed straight from Horizon&apos;s Soroban event stream. Typehead or click a chain
          tag to quickly slice down to a category.
        </p>
      </header>
      <TransactionsPanel initial={initial.transactions} chainFilter={sp.chain} typeFilter={sp.type} />
    </div>
  );
}
