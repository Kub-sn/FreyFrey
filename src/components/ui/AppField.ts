import { cn } from '../../lib/classnames';

const baseFieldClassName = 'w-full rounded-[18px] border-[rgba(24,52,47,0.14)] bg-[rgba(255,255,255,0.92)] text-[#18342f] shadow-none placeholder:text-[rgba(24,52,47,0.5)] focus:border-[rgba(25,98,77,0.35)] focus:outline-none focus:ring-4 focus:ring-[rgba(25,98,77,0.1)]';

export function appInputClassName(className?: string) {
  return cn('app-input input input-bordered min-h-[3.45rem] px-4', baseFieldClassName, className);
}

export function appTextareaClassName(className?: string) {
  return cn('app-textarea textarea textarea-bordered min-h-[10rem] px-4 py-3', baseFieldClassName, className);
}

export function appSelectClassName(className?: string) {
  return cn('app-select select select-bordered min-h-[3.45rem] px-4', baseFieldClassName, className);
}