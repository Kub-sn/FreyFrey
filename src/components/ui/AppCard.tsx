import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '../../lib/classnames';

export function AppCard<T extends ElementType = 'article'>({
  as,
  children,
  className,
  ...props
}: {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>) {
  const Component = as ?? 'article';

  return (
    <Component
      {...props}
      className={cn(
        'app-card panel card rounded-[24px] border border-[rgba(24,52,47,0.1)] bg-[rgba(255,255,255,0.78)] shadow-[0_18px_44px_rgba(24,52,47,0.08)]',
        className,
      )}
    >
      {children}
    </Component>
  );
}