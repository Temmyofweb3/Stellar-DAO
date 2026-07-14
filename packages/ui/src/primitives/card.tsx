import { cn } from '../utils/cn.js';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('rounded-2xl border border-white/5 bg-stellar-slate/60 shadow-card backdrop-blur-xl', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <header className={cn('flex flex-col gap-1 border-b border-white/5 p-5', className)}>{children}</header>
);

export const CardBody = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('p-5', className)}>{children}</div>
);

export const CardFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <footer className={cn('border-t border-white/5 p-5 text-xs text-stellar-haze', className)}>{children}</footer>
);
