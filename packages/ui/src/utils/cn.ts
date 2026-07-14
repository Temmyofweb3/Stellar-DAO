import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class lists while respecting Tailwind default precedence. */
export const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(...inputs));
