// path: apps/desktop/src/components/ui/button.tsx
// purpose: Button primitive with the GhostDesk variants (default, primary, danger, ghost).
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[10px] border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-edge bg-field text-ink hover:border-[#44577f]',
        primary: 'border-cyan bg-cyan font-bold text-[#04202a] hover:brightness-110',
        danger: 'border-[#5a2438] bg-field text-[#ff7aa3] hover:border-pink',
        ghost: 'border-transparent bg-transparent text-mute hover:text-ink',
      },
      size: { default: 'h-10 px-4', sm: 'h-8 px-3', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';
