import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/classnames';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'md' | 'icon';

const baseClassName = 'app-button btn font-semibold normal-case tracking-normal shadow-sm transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60';

const variantClassNames: Record<ButtonVariant, string> = {
  primary: 'auth-submit btn-primary border-transparent bg-[#18342f] text-[#f6efe2] hover:bg-[#233f36]',
  secondary: 'secondary-action btn-outline border-[rgba(24,52,47,0.14)] bg-[rgba(255,255,255,0.86)] text-[#18342f] hover:border-[rgba(24,52,47,0.18)] hover:bg-[rgba(248,242,232,0.96)]',
  danger: 'secondary-action danger-action btn-error border-[rgba(117,30,18,0.24)] bg-[#c8472d] text-[#fff7f2] hover:bg-[#a64722]',
  ghost: 'ghost-toggle btn-ghost border border-[rgba(24,52,47,0.1)] bg-[rgba(24,52,47,0.08)] text-[#18342f] hover:bg-[rgba(24,52,47,0.14)]',
};

const sizeClassNames: Record<ButtonSize, string> = {
  md: 'h-auto min-h-0 rounded-[18px] px-4 py-3',
  icon: 'h-auto min-h-0 rounded-full p-0 size-[2.2rem]',
};

export function buttonClassName({
  className,
  size = 'md',
  variant = 'primary',
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return cn(baseClassName, variantClassNames[variant], sizeClassNames[size], className);
}

export function AppButton({
  children,
  className,
  size = 'md',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <button
      {...props}
      data-app-button-variant={variant}
      data-app-button-size={size}
      className={buttonClassName({ className, size, variant })}
    >
      {children}
    </button>
  );
}

export function AppButtonLink({
  children,
  className,
  size = 'md',
  variant = 'secondary',
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <a
      {...props}
      data-app-button-variant={variant}
      data-app-button-size={size}
      className={buttonClassName({ className, size, variant })}
    >
      {children}
    </a>
  );
}