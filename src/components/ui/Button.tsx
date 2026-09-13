import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft',
  accent: 'bg-accent text-accent-foreground hover:brightness-90 shadow-soft',
  outline: 'border border-input bg-transparent hover:bg-muted hover:border-foreground/20',
  ghost: 'hover:bg-muted',
  link: 'text-accent underline-offset-4 hover:underline',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-11 gap-1.5 px-3.5 py-2 text-sm',
  md: 'min-h-11 gap-2 px-5 py-2 text-sm',
  lg: 'min-h-12 gap-2 px-7 py-2 text-base',
  icon: 'min-h-11 min-w-11 justify-center',
}

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(
    'ui-button inline-flex items-center justify-center rounded-md font-medium tracking-tight',
    'transition-[background-color,border-color,color,transform] duration-200 ease-out',
    'motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variant === 'link' ? 'h-auto px-0' : sizeClasses[size],
    variantClasses[variant],
    className,
  )
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />
}
