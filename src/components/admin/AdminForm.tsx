'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useToast } from '@/components/ui/Toast'
import { serializeFormEntries } from '@/lib/form-snapshot'
import type { AdminActionState } from '@/server/admin-state'
import { AdminFormPendingProvider, INVALID_EVENT, REVEAL_EVENT } from './admin-form-context'
import { SubmitButton } from './AdminUI'
import { notifyGuardChange, registerGuard } from './LeaveGuard'

/**
 * ฟอร์มหลังบ้านทุกฟอร์มใช้ตัวนี้แทน <form action={...}>
 *
 * 1. บันทึกไม่ผ่าน ข้อมูลที่กรอกต้องอยู่ครบ
 *    React 19 ล้างช่องแบบ uncontrolled ทุกช่องหลัง action ของ <form> ทำงานเสร็จ ไม่ว่าผลจะสำเร็จหรือไม่
 *    ฟอร์มหลังบ้านใช้ defaultValue เกือบทั้งหมด ลืมใส่รูปปกทีเดียวจึงต้องกรอกใหม่ทั้งหน้า
 *    ที่นี่ดักการส่งเองแล้วเรียก action ใน transition ซึ่ง React ไม่ล้างฟอร์มให้
 *
 * 2. ตรวจก่อนส่ง แล้วพาไปที่ช่องที่ขาด
 *    ช่องรูปเป็น hidden input ที่เบราว์เซอร์ไม่ตรวจ required และช่องที่อยู่ในแท็บภาษาที่ซ่อนอยู่
 *    ทำให้ Chrome ไม่ยอมส่งฟอร์มเงียบ ๆ โดยไม่บอกอะไร ที่นี่ตรวจเองทั้งหมด สลับแท็บ เลื่อน และโฟกัสให้
 *    ข้อผิดพลาดจาก server ที่บอกชื่อช่อง (state.field) ก็พาไปที่ช่องนั้นเหมือนกัน
 *
 * 3. รู้ว่ามีอะไรแก้ค้างอยู่
 *    เทียบค่าที่จะส่งจริงกับตอนเปิดหน้าหรือตอนบันทึกล่าสุด ใช้ทั้งแถบ "ยังไม่ได้บันทึก" และตัวเตือนก่อนออก
 */

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function isControl(element: unknown): element is Control {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  )
}

function labelOf(element: Control): string {
  const text =
    element.dataset.label ||
    element.labels?.[0]?.textContent ||
    element.getAttribute('aria-label') ||
    ''
  return text.replace(/\*/g, '').replace(/\s+/g, ' ').trim()
}

/** ป้ายภาษาอังกฤษต้องเว้นวรรคจากคำไทยข้างหน้า ("ต้องกรอก Title" ไม่ใช่ "ต้องกรอกTitle") */
function afterThai(label: string): string {
  return /^[A-Za-z0-9]/.test(label) ? ` ${label}` : label
}

function problemMessage(element: Control): string {
  const label = labelOf(element)
  const { validity } = element
  if (validity.valueMissing) return label ? `ต้องกรอก${afterThai(label)}` : 'ต้องกรอกช่องนี้'
  if (validity.typeMismatch || validity.patternMismatch) return label ? `${label} รูปแบบไม่ถูกต้อง` : 'รูปแบบไม่ถูกต้อง'
  return label ? `${label}: ${element.validationMessage}` : element.validationMessage
}

function findProblem(form: HTMLFormElement): { element: Control; message: string } | null {
  for (const element of Array.from(form.elements)) {
    if (!isControl(element) || element.disabled || !element.name) continue

    if (element instanceof HTMLInputElement && element.type === 'hidden') {
      if (element.hasAttribute('required') && !element.value.trim()) {
        return { element, message: `ต้องใส่${afterThai(labelOf(element)) || 'ข้อมูลช่องนี้'}ก่อนบันทึก` }
      }
      continue
    }

    if (!element.checkValidity()) return { element, message: problemMessage(element) }
  }
  return null
}

function findField(form: HTMLFormElement, name: string): Control | null {
  const item = form.elements.namedItem(name)
  const element = item instanceof RadioNodeList ? item[0] : item
  return isControl(element) ? element : null
}

/** เปิดส่วนที่ซ่อนช่องไว้ ทำเครื่องหมาย เลื่อนไปให้เห็น แล้วโฟกัส */
function pointTo(element: Control, message: string) {
  element.dispatchEvent(new CustomEvent(REVEAL_EVENT, { bubbles: true }))
  const details = element.closest('details')
  if (details) details.open = true

  element.dispatchEvent(new CustomEvent(INVALID_EVENT, { bubbles: true, detail: message }))

  const isHidden = element instanceof HTMLInputElement && element.type === 'hidden'
  if (!isHidden) {
    element.setAttribute('aria-invalid', 'true')
    const clear = () => element.removeAttribute('aria-invalid')
    element.addEventListener('input', clear, { once: true })
    element.addEventListener('change', clear, { once: true })
  }

  const container = isHidden ? (element.closest('fieldset') ?? element.parentElement) : element
  requestAnimationFrame(() => {
    container?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const focusTarget = isHidden
      ? container?.querySelector<HTMLElement>('button:not([disabled]), input:not([type="hidden"]), select, textarea')
      : element
    focusTarget?.focus({ preventScroll: true })
  })
}

type AdminFormProps = Omit<ComponentProps<'form'>, 'action' | 'onSubmit' | 'children'> & {
  /** ตัวส่งจาก useActionState */
  action: (formData: FormData) => void
  state: AdminActionState
  isPending: boolean
  /** ชื่อสิ่งที่กำลังแก้ ใช้ในกล่องเตือนก่อนออก เช่น "ผลงาน" — ไม่ใส่ = ไม่เตือน */
  guardLabel?: string
  /** ใส่เมื่อฟอร์มยาว จะมีแถบบันทึกติดล่างจอเมื่อมีการแก้ค้าง */
  saveLabel?: string
  /** ล้างฟอร์มหลังบันทึกสำเร็จ เช่นช่องโน้ตที่พิมพ์รายการถัดไปต่อทันที */
  resetOnSuccess?: boolean
  children: ReactNode
}

export function AdminForm({
  action,
  state,
  isPending,
  guardLabel,
  saveLabel,
  resetOnSuccess = false,
  children,
  ...props
}: AdminFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const baseline = useRef<string | null>(null)
  const submitting = useRef(false)
  const dirtyRef = useRef(false)
  const handledState = useRef(state)
  const [isDirty, setIsDirty] = useState(false)
  const { show } = useToast()

  const snapshot = useCallback(
    () => (formRef.current ? serializeFormEntries(new FormData(formRef.current)) : ''),
    [],
  )

  const computeDirty = useCallback(() => {
    if (baseline.current === null || submitting.current) return false
    return snapshot() !== baseline.current
  }, [snapshot])

  const refresh = useCallback(() => {
    const next = computeDirty()
    if (next === dirtyRef.current) return
    dirtyRef.current = next
    setIsDirty(next)
    notifyGuardChange()
  }, [computeDirty])

  // จุดตั้งต้น — รอให้ช่องที่คอมโพเนนต์ข้างในวาดจาก state (รูป แกลเลอรี รายการ) ขึ้นครบก่อน
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      baseline.current = snapshot()
    })
    return () => cancelAnimationFrame(frame)
  }, [snapshot])

  // พิมพ์ เลือก ติ๊ก หรือช่องซ่อนเปลี่ยนค่า (อัปโหลดรูป จัดลำดับ ลบแถว) ให้เช็คใหม่
  useEffect(() => {
    const form = formRef.current
    if (!form) return

    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(refresh)
    }

    form.addEventListener('input', schedule)
    form.addEventListener('change', schedule)
    const observer = new MutationObserver(schedule)
    observer.observe(form, { subtree: true, childList: true, attributes: true, attributeFilter: ['value', 'name'] })

    return () => {
      cancelAnimationFrame(frame)
      form.removeEventListener('input', schedule)
      form.removeEventListener('change', schedule)
      observer.disconnect()
    }
  }, [refresh])

  useEffect(() => {
    if (!guardLabel) return
    return registerGuard({ label: guardLabel, isDirty: computeDirty, form: () => formRef.current })
  }, [guardLabel, computeDirty])

  // ผลจาก server — สำเร็จแล้วถือว่าค่าตอนนี้คือจุดตั้งต้นใหม่ ไม่สำเร็จให้ข้อมูลอยู่ครบและพาไปที่ช่องที่ผิด
  useEffect(() => {
    if (handledState.current === state) return
    handledState.current = state
    submitting.current = false

    const form = formRef.current
    if (!form) return

    if (state.status === 'success') {
      if (resetOnSuccess) form.reset()
      baseline.current = snapshot()
    } else if (state.status === 'error' && state.field) {
      const field = findField(form, state.field)
      if (field) pointTo(field, state.message ?? 'ช่องนี้ยังไม่ถูกต้อง')
    }

    // เช็คในเฟรมถัดไป ค่าที่หน้าเรนเดอร์ใหม่หลังบันทึก (เช่นเวอร์ชันล่าสุด) จะลงช่องครบแล้ว
    const frame = requestAnimationFrame(refresh)
    return () => cancelAnimationFrame(frame)
  }, [state, resetOnSuccess, snapshot, refresh])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    const form = event.currentTarget
    const problem = findProblem(form)
    if (problem) {
      pointTo(problem.element, problem.message)
      show(problem.message, 'error')
      return
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter
    let formData: FormData
    try {
      formData = new FormData(form, submitter)
    } catch {
      formData = new FormData(form)
    }

    // ระหว่างส่งไม่นับว่าค้าง บันทึกผลงานใหม่แล้วระบบพาไปหน้าผลงานเอง ต้องไม่ถูกถามว่าจะออกไหม
    submitting.current = true
    refresh()
    startTransition(() => action(formData))
  }

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <AdminFormPendingProvider value={isPending}>
      <form ref={formRef} noValidate onSubmit={onSubmit} aria-busy={isPending} {...props}>
        {children}

        {saveLabel && (isDirty || isPending) && (
          <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-md">
            <p className="text-sm">
              {isPending ? 'กำลังบันทึก' : 'มีการแก้ไขที่ยังไม่ได้บันทึก'}
              {!isPending && (
                <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                  กด {isMac ? '⌘' : 'Ctrl'} + S เพื่อบันทึก
                </span>
              )}
            </p>
            <SubmitButton size="sm">{saveLabel}</SubmitButton>
          </div>
        )}
      </form>
    </AdminFormPendingProvider>
  )
}
