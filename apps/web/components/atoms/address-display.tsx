'use client';

import { useState } from 'react';

export const AddressDisplay = ({
  value,
  truncateChars = 6,
  mono = true,
}: {
  value: string;
  truncateChars?: number;
  mono?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const truncated =
    value.length > truncateChars * 2 + 1
      ? `${value.slice(0, truncateChars)}…${value.slice(-truncateChars)}`
      : value;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={`focus-ring inline-flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-xs text-stellar-cloud hover:bg-white/10 ${
        mono ? 'mono' : ''
      }`}
      title={value}
    >
      {truncated}
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${copied ? 'bg-emerald-400' : 'bg-stellar-haze/40'}`} />
    </button>
  );
};
