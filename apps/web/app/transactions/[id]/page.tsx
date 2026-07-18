import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Transaction · StellarDAO',
};

export default function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/transactions"
          className="text-sm text-stellar-haze hover:text-white transition"
        >
          ← Back to transactions
        </Link>
      </div>

      <section>
        <h1 className="font-display text-2xl font-semibold text-white">
          Transaction{' '}
          <span className="mono text-stellar-haze">{params.id.slice(0, 12)}…</span>
        </h1>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-stellar-haze">Status</dt>
              <dd>
                <span className="inline-flex items-center gap-1.5 text-stellar-nova">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-stellar-nova" />
                  Processing
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stellar-haze">Type</dt>
              <dd className="mono text-stellar-cloud">wrap</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stellar-haze">Source Chain</dt>
              <dd className="mono text-stellar-cloud">ethereum</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stellar-haze">Amount</dt>
              <dd className="mono text-stellar-cloud">1,000.00</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stellar-haze">Created</dt>
              <dd className="mono text-stellar-cloud">{new Date().toISOString()}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Blockchain Data</h2>
          <p className="text-xs text-stellar-haze">
            On-chain details will populate here once the transaction is confirmed
            on Stellar.
          </p>
        </div>
      </div>
    </div>
  );
}
