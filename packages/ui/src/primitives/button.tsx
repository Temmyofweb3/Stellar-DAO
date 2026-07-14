import { cn } from '../utils/cn.js';

type Variant = 'primary' | 'secondary' | 'ghost';

export const Button = ({
  variant = 'primary',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) => {
  const styles = {
    primary:
      'bg-gradient-to-r from-stellar-aurora to-stellar-nova text-white shadow-glow hover:-translate-y-0.5',
    secondary: 'border border-white/10 bg-white/5 text-stellar-cloud hover:border-white/20 hover:bg-white/10',
    ghost: 'text-stellar-haze hover:text-white',
  } satisfies Record<Variant, string>;

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stellar-aurora/60 focus-visible:ring-offset-2 focus-visible:ring-offset-stellar-ink',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
