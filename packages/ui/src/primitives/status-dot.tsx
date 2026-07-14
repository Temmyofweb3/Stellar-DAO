import { cn } from '../utils/cn.js';

export type Status = 'pending' | 'attesting' | 'minting' | 'completed' | 'failed' | 'refunded';

const colorByStatus: Record<Status, string> = {
  pending: 'bg-amber-300',
  attesting: 'bg-sky-300',
  minting: 'bg-stellar-aurora',
  completed: 'bg-emerald-400',
  failed: 'bg-rose-500',
  refunded: 'bg-stellar-haze',
};

export const StatusDot = ({ status, label }: { status: Status; label?: string }) => (
  <span className="inline-flex items-center gap-2 text-xs text-stellar-haze">
    <span className={cn('h-2 w-2 animate-pulse-soft rounded-full', colorByStatus[status])} />
    {label ?? status}
  </span>
);
