import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SectionProps = {
  id?: string
  eyebrow?: string
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  /** พื้นหลังสลับชั้นเพื่อให้แต่ละ section แยกจากกันโดยไม่ต้องใช้เส้นคั่น */
  tone?: 'default' | 'subtle'
  className?: string
  align?: 'left' | 'center'
}

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  action,
  children,
  tone = 'default',
  className,
  align = 'left',
}: SectionProps) {
  const hasHeader = Boolean(eyebrow || title || subtitle || action)

  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 py-20 md:py-28',
        tone === 'subtle' && 'bg-subtle',
        className,
      )}
    >
      <div className="container">
        {hasHeader && (
          <div
            className={cn(
              'section-header reveal mb-12 flex flex-col gap-6 md:mb-16',
              align === 'left' ? 'md:flex-row md:items-end md:justify-between' : 'items-center text-center',
            )}
          >
            <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
              {eyebrow && (
                <p
                  className={cn(
                    // Public layouts add the shared editorial eyebrow rule.
                    'section-eyebrow mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent',
                    align === 'center' && 'justify-center',
                  )}
                >
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="font-display text-display-md text-balance">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty md:text-lg">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
