'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * เตือนก่อนออกจากหน้าที่ยังมีการแก้ไขค้างอยู่
 *
 * ครอบคลุมทุกทางที่ออกจากหน้าได้:
 *   ปิดแท็บ / รีเฟรช / พิมพ์ URL ใหม่  → กล่องยืนยันของเบราว์เซอร์ (beforeunload)
 *   คลิกลิงก์ในหลังบ้าน                → กล่องยืนยันของเราเอง
 *   ปุ่มย้อนกลับ / ปัดย้อนบนมือถือ      → กล่องยืนยันของเราเอง
 *   ออกจากระบบ                          → ฟอร์มที่ติด data-leave-guard
 *
 * ปุ่มย้อนกลับห้ามยกเลิกได้ตรง ๆ จึงวาง "ช่องกัน" ไว้ในประวัติหนึ่งช่องตอนเริ่มแก้
 * กดย้อนกลับแล้วจะหลุดออกจากช่องกันก่อน (URL เดิม หน้าไม่เปลี่ยน) ระหว่างนั้นถามว่าจะออกจริงไหม
 * ถ้าบันทึกแล้วไม่มีอะไรค้าง ช่องกันจะพาย้อนต่อให้เอง กดย้อนครั้งเดียวก็ออกได้เหมือนปกติ
 *
 * ฟอร์มลงทะเบียนผ่าน registerGuard (AdminForm ทำให้เอง) คอมโพเนนต์นี้วางไว้ที่ AdminShell ที่เดียว
 */

type GuardEntry = {
  label: string
  isDirty: () => boolean
  form: () => HTMLFormElement | null
}

const entries = new Map<symbol, GuardEntry>()
const listeners = new Set<() => void>()

/** แจ้งว่าฟอร์มใดฟอร์มหนึ่งเปลี่ยนจากไม่มีอะไรค้างเป็นมีค้าง หรือกลับกัน */
export function notifyGuardChange(): void {
  for (const listener of listeners) listener()
}

export function registerGuard(entry: GuardEntry): () => void {
  const key = Symbol('leave-guard')
  entries.set(key, entry)
  notifyGuardChange()
  return () => {
    entries.delete(key)
    notifyGuardChange()
  }
}

function dirtyEntries(): GuardEntry[] {
  return [...entries.values()].filter((entry) => entry.isDirty())
}

/** ฟอร์มที่ Ctrl+S ควรบันทึก: ฟอร์มที่กำลังพิมพ์อยู่ หรือฟอร์มเดียวที่มีการแก้ค้าง */
function preferredForm(): HTMLFormElement | null {
  const active = document.activeElement
  for (const entry of entries.values()) {
    const form = entry.form()
    if (form && active && form.contains(active)) return form
  }
  const dirty = dirtyEntries()
  return dirty.length === 1 ? dirty[0].form() : null
}

const SENTINEL = '__alexanLeaveGuard'

/**
 * รหัสของช่องกันที่วางไว้ให้หน้าปัจจุบัน — null คือยังไม่ได้วาง
 *
 * ช่องกันแต่ละช่องมีรหัสของตัวเอง ย้อนกลับไปตกที่ช่องกันรหัสอื่น (ของหน้าที่บันทึกไปแล้วก่อนเปลี่ยนหน้า)
 * แปลว่าช่องนั้นหมดหน้าที่แล้ว ข้ามไปได้เลย ไม่ต้องอ่าน history.state ระหว่างเปลี่ยนหน้า
 * ซึ่งจังหวะนั้นอาจยังเป็นค่าของหน้าเก่าอยู่
 */
let armedId: string | null = null
/** ผู้ใช้ยืนยันออกแล้ว อย่าถามซ้ำระหว่างกำลังพาไปหน้าใหม่ */
let bypass = false
/** กำลังพาข้ามช่องกันที่ไม่ได้ใช้แล้ว popstate ครั้งถัดไปเป็นผลของการข้ามนั้น ไม่ใช่ผู้ใช้กด */
let skippingSentinel = false

function pushSentinel() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  window.history.pushState({ ...window.history.state, [SENTINEL]: id }, '', window.location.href)
  armedId = id
}

type Pending =
  | { kind: 'link'; href: string }
  | { kind: 'back' }
  | { kind: 'submit'; form: HTMLFormElement }

export function LeaveGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const routerRef = useRef(router)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [labels, setLabels] = useState<string[]>([])
  const [saveTarget, setSaveTarget] = useState<HTMLFormElement | null>(null)

  useEffect(() => {
    routerRef.current = router
  }, [router])

  /**
   * หน้าใหม่เริ่มนับใหม่ ช่องกันของหน้าเก่าไม่เกี่ยวกับหน้านี้
   * ยกเว้นตอนติดตั้งครั้งแรกบนช่องกันพอดี (รีเฟรชหน้าค้างไว้) ถือว่าช่องนั้นเป็นของหน้านี้
   * กดย้อนครั้งหน้าจะได้ข้ามให้ ไม่ต้องกดสองครั้ง
   */
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      armedId = window.history.state?.[SENTINEL] ?? null
    } else if (!skippingSentinel) {
      armedId = null
    }
    bypass = false
  }, [pathname])

  useEffect(() => {
    const ask = (next: Pending) => {
      const dirty = dirtyEntries()
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setLabels([...new Set(dirty.map((entry) => entry.label))])
      setSaveTarget(dirty.length === 1 ? dirty[0].form() : null)
      setPending(next)
    }

    const arm = () => {
      if (armedId === null && !bypass && dirtyEntries().length > 0) pushSentinel()
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypass || dirtyEntries().length === 0) return
      event.preventDefault()
      // เบราว์เซอร์รุ่นเก่าต้องมีค่านี้ถึงจะถาม ข้อความจริงเบราว์เซอร์กำหนดเองเสมอ
      event.returnValue = ''
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(anchor instanceof HTMLAnchorElement)) return
      // เปิดแท็บใหม่หรือดาวน์โหลด หน้านี้ยังอยู่ ไม่ต้องถาม
      if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (bypass || dirtyEntries().length === 0) return

      // ดักก่อนถึง Link ของ Next ซึ่งฟังอยู่ที่ root ของ React
      event.preventDefault()
      event.stopImmediatePropagation()
      ask({ kind: 'link', href: `${url.pathname}${url.search}${url.hash}` })
    }

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-leave-guard')) return
      if (bypass || dirtyEntries().length === 0) return
      event.preventDefault()
      event.stopImmediatePropagation()
      ask({ kind: 'submit', form })
    }

    const onPopState = (event: PopStateEvent) => {
      if (skippingSentinel) {
        skippingSentinel = false
        armedId = null
        return
      }

      const landedOn = event.state?.[SENTINEL]
      if (landedOn) {
        // ย้อนจากหน้าอื่นกลับมาถึงช่องกันของหน้าที่เคยแก้ ฟอร์มถูกโหลดใหม่ ไม่มีอะไรค้าง ข้ามช่องนี้ไป
        if (landedOn !== armedId) {
          skippingSentinel = true
          window.history.back()
        }
        return
      }

      if (armedId === null) return
      armedId = null
      if (bypass) return

      if (dirtyEntries().length === 0) {
        // บันทึกเรียบร้อยแล้ว ช่องกันไม่มีหน้าที่อะไร พาย้อนต่อตามที่ผู้ใช้ตั้งใจ
        window.history.back()
        return
      }

      ask({ kind: 'back' })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
      if (event.key.toLowerCase() !== 's' || entries.size === 0) return
      // หน้านี้มีฟอร์มให้บันทึก — ไม่ปล่อยให้เบราว์เซอร์เปิดหน้าต่าง "บันทึกหน้าเว็บ"
      event.preventDefault()
      preferredForm()?.requestSubmit()
    }

    listeners.add(arm)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    document.addEventListener('submit', onSubmit, true)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      listeners.delete(arm)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('submit', onSubmit, true)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const close = () => {
    setPending(null)
    returnFocus.current?.focus()
  }

  const stay = () => {
    // ช่องกันถูกใช้ไปแล้วตอนกดย้อนกลับ วางใหม่ให้กดย้อนครั้งหน้ายังถามอยู่
    if (pending?.kind === 'back') pushSentinel()
    close()
  }

  const leave = () => {
    const next = pending
    setPending(null)
    if (!next) return
    bypass = true

    if (next.kind === 'back') {
      window.history.back()
    } else if (next.kind === 'link') {
      // แทนที่ช่องกันด้วยหน้าใหม่ ไม่ทิ้งช่องว่างไว้ให้ต้องกดย้อนเพิ่มอีกครั้งทีหลัง
      if (armedId !== null) {
        armedId = null
        routerRef.current.replace(next.href)
      } else {
        routerRef.current.push(next.href)
      }
    } else {
      next.form.requestSubmit()
    }
  }

  const saveFirst = () => {
    if (pending?.kind === 'back') pushSentinel()
    setPending(null)
    saveTarget?.requestSubmit()
  }

  if (!pending) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) stay()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-guard-title"
        aria-describedby="leave-guard-description"
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          stay()
        }}
        className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg"
      >
        <h2 id="leave-guard-title" className="font-display text-2xl">
          ออกจากหน้านี้ใช่ไหม
        </h2>
        <p id="leave-guard-description" className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          คุณกำลังแก้ไข{labels.length ? labels.join(' และ ') : 'ข้อมูล'}ค้างอยู่และยังไม่ได้บันทึก
          ถ้าออกตอนนี้ สิ่งที่แก้ไว้จะหายไป
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={leave} className="text-destructive hover:bg-destructive/10">
            ออกโดยไม่บันทึก
          </Button>
          {saveTarget && (
            <Button variant="outline" onClick={saveFirst}>
              บันทึกก่อน
            </Button>
          )}
          <Button variant="primary" onClick={stay} autoFocus>
            อยู่ต่อ
          </Button>
        </div>
      </div>
    </div>
  )
}
