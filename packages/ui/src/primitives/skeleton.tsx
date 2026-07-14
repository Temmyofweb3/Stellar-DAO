import { cn } from '../utils/cn.js';

export const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'shimmer-stripe h-4 w-full rounded-md bg-stellar-steel/50',
      className,
    )}
    aria-hidden
  />
);
