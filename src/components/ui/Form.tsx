import { Children, cloneElement, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const controlClasses =
  'w-full rounded-md border border-input bg-surface px-3.5 py-2.5 text-base min-h-11 text-foreground ' +
  'placeholder:text-muted-foreground transition-colors ' +
  'hover:border-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-[invalid=true]:border-destructive'

type FieldProps = {
  /** ต้องตรงกับ id ของ control ข้างใน เพื่อให้คลิก label แล้วโฟกัสถูกช่อง */
  htmlFor: string
  label: string
  hint?: string
  error?: string[]
  required?: boolean
  optionalLabel?: string
  children: ReactNode
  className?: string
}

export function Field({
  htmlFor,
  label,
  hint,
  error,
  required,
  optionalLabel,
  children,
  className,
}: FieldProps) {
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-sm font-medium">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : (
          optionalLabel && (
            <span className="text-xs font-normal text-muted-foreground">{optionalLabel}</span>
          )
        )}
      </label>

      {Children.map(children, (child) => {
        if (!isValidElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(child) || child.props.id !== htmlFor) return child
        const describedBy = [child.props['aria-describedby'], error?.length ? errorId : hint ? hintId : undefined].filter(Boolean).join(' ')
        return cloneElement(child, { 'aria-describedby': describedBy || undefined, 'aria-invalid': Boolean(error?.length) || child.props['aria-invalid'] })
      })}

      {hint && !error?.length && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error?.length ? (
        <p id={errorId} className="text-sm text-destructive">
          {error.join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClasses, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClasses, 'min-h-32 resize-y', className)} {...props} />
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select className={cn(controlClasses, 'appearance-none pr-11', className)} {...props}>
        {children}
      </select>
      <ChevronDown size={18} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </span>
  )
}

/** ช่องล่อบอต — ซ่อนจากทั้งสายตาและ screen reader แต่ยังอยู่ใน DOM ให้บอตกรอก */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  )
}

type FormMessageProps = {
  status: 'idle' | 'success' | 'error'
  children: ReactNode
}

export function FormMessage({ status, children }: FormMessageProps) {
  if (status === 'idle') return null

  return (
    <p
      // assertive สำหรับ error เพื่อให้ screen reader ขัดจังหวะแจ้งทันที
      role="status"
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'rounded-md border px-4 py-3 text-sm',
        status === 'success'
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      {children}
    </p>
  )
}
