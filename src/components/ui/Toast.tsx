'use client'

import { X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * แจ้งผลการทำงานแบบลอยมุมจอ
 *
 * มีไว้เพราะฟอร์มหลังบ้านยาวมาก ข้อความผลลัพธ์อยู่ท้ายฟอร์มซึ่งมักตกอยู่นอกจอตอนกดบันทึก
 * คนกรอกจึงไม่รู้ว่าบันทึกผ่านหรือไม่ผ่าน แล้วกดซ้ำหรือปิดหน้าไปทั้งที่ยังไม่สำเร็จ
 *
 * ตัวนี้ทำหน้าที่ "สะกิดสายตา" อย่างเดียว ไม่ได้มาแทน FormMessage ในฟอร์ม
 * และตั้งใจไม่ใส่ aria-live ตรงนี้ เพราะ FormMessage ประกาศข้อความเดียวกันอยู่แล้ว
 * ถ้าใส่ทั้งสองที่ screen reader จะอ่านซ้ำสองรอบ
 */

export type ToastTone = 'success' | 'error'

type ToastItem = { id: number; message: string; tone: ToastTone }

const ToastContext = createContext<{ show: (message: string, tone: ToastTone) => void } | null>(
  null,
)

/** ข้อความสำเร็จหายเองได้ ส่วนข้อความผิดพลาดค้างไว้จนกว่าจะกดปิด — ของที่พังไม่ควรหายไปเอง */
const AUTO_DISMISS_MS = 4500

/** โชว์พร้อมกันได้มากสุดสามใบ ที่เกินจะดันใบเก่าสุดออก ไม่งั้นกดรัว ๆ แล้วท่วมจอ */
const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, tone }].slice(-MAX_VISIBLE))

      if (tone === 'success') {
        window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      }
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface px-4 py-3 text-sm shadow-lg',
              toast.tone === 'success'
                ? 'border-success/40 text-success'
                : 'border-destructive/40 text-destructive',
            )}
          >
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="ปิดข้อความนี้"
              className="-mr-1 -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={15} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast ต้องอยู่ภายใต้ <ToastProvider>')
  return context
}

/**
 * ยิงข้อความแจ้งผลเมื่อผลลัพธ์ของ server action เปลี่ยน
 *
 * เทียบด้วยตัว object ไม่ใช่เนื้อข้อความ เพราะ useActionState คืน object ใหม่ทุกครั้งที่ยิง
 * กดบันทึกซ้ำแล้วได้ผลเหมือนเดิมจึงยังเด้งให้เห็นว่าระบบรับคำสั่งแล้ว
 * ส่วนตอน mount ครั้งแรกจะเงียบ เพราะยังไม่มีอะไรเกิดขึ้นให้รายงาน
 */
export function useActionToast(state: { status: 'idle' | 'success' | 'error'; message?: string }) {
  const { show } = useToast()
  const seen = useRef(state)

  useEffect(() => {
    if (seen.current === state) return
    seen.current = state

    if (state.status !== 'idle' && state.message) {
      show(state.message, state.status)
    }
  }, [state, show])
}
