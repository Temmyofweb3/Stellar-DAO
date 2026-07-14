import { describe, expect, it } from 'vitest';

import { cn } from './cn.js';

describe('cn', () => {
  it('merges multiple class strings into a single space-separated string', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values (false, null, undefined, 0, "")', () => {
    // clsx + tailwind-merge: the standard ergonomics for conditional
    // Tailwind class composition.
    expect(cn('base', false && 'hidden', null, undefined, '', 'extra')).toBe('base extra');
  });

  it('resolves Tailwind class conflicts by keeping the last one', () => {
    // twMerge collapses `px-2 px-4` down to a single class.
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
