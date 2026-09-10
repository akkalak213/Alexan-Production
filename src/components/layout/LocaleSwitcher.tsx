'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useTransition } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { localeLabels, locales, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

/** จุดยึดที่จำไว้ก่อนสลับภาษา เพื่อพากลับมาที่เดิมหลังเนื้อหาเปลี่ยน */
type ScrollAnchor = { index: number; offset: number; at: number }

/**
 * เก็บใน sessionStorage ไม่ใช่ใน useRef หรือตัวแปรระดับโมดูล
 *
 * locale เป็น dynamic segment ของ layout เวลาสลับภาษา React จึง unmount ทั้ง subtree
 * แล้ว mount ใหม่ ค่าที่เก็บใน ref หายไปพร้อมกัน ทดสอบแล้วพบว่าโค้ดคืน scroll ไม่เคยได้ทำงานเลย
 * ส่วนตัวแปรระดับโมดูลก็แก้ไม่ได้เพราะ React Compiler ห้ามคอมโพเนนต์เขียนทับค่านอกตัวเอง
 */
const ANCHOR_KEY = 'alexan:locale-anchor'

function saveAnchor(anchor: ScrollAnchor | null) {
  try {
    if (anchor) sessionStorage.setItem(ANCHOR_KEY, JSON.stringify(anchor))
    else sessionStorage.removeItem(ANCHOR_KEY)
  } catch {
    // โหมดส่วนตัวของบางเบราว์เซอร์ปิด sessionStorage — แค่ไม่ได้คืนตำแหน่ง ไม่ควรทำให้ปุ่มพัง
  }
}

function takeAnchor(): ScrollAnchor | null {
  try {
    const raw = sessionStorage.getItem(ANCHOR_KEY)
    if (!raw) return null
    sessionStorage.removeItem(ANCHOR_KEY)
    return JSON.parse(raw) as ScrollAnchor
  } catch {
    return null
  }
}

/**
 * เอาเฉพาะลูกของ main ที่กินพื้นที่จริง
 *
 * JsonLd เรนเดอร์เป็น <script> ซึ่งเป็นลูกของ main เหมือนกันแต่ไม่มีกล่อง
 * ถ้านับรวมไปด้วย ลำดับที่จะเลื่อนไปตามจำนวน script ที่แต่ละหน้ามีไม่เท่ากัน
 * แล้วตอนคืนตำแหน่งจะไปยึดผิดชิ้น — เจอตอนทดสอบหน้ารายละเอียดบริการ เลื่อนผิดไป 309px
 */
function renderedSections(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('main > *')).filter(
    (el) => el.getBoundingClientRect().height > 0,
  )
}

/**
 * หา section ที่ผู้ใช้กำลังอ่านอยู่ แล้วจำว่ามันอยู่สูงจากขอบบนจอเท่าไหร่
 *
 * ใช้ลำดับที่ (index) เป็นตัวอ้างอิงแทน id เพราะทั้งสองภาษาเรนเดอร์จาก component ชุดเดียวกัน
 * ลำดับและจำนวน section จึงตรงกันเสมอ ต่างกันแค่ความสูงเพราะความยาวข้อความไม่เท่ากัน
 */
function readAnchor(): ScrollAnchor | null {
  if (window.scrollY < 4) return null

  const sections = renderedSections()
  for (let index = sections.length - 1; index >= 0; index--) {
    const top = sections[index].getBoundingClientRect().top
    // ส่วนที่อยู่สูงสุดโดยที่ขอบบนยังไม่เลยกลางจอลงไป คือส่วนที่กำลังอ่านอยู่
    if (top <= window.innerHeight * 0.5) return { index, offset: top, at: Date.now() }
  }

  const first = sections[0]
  return first ? { index: 0, offset: first.getBoundingClientRect().top, at: Date.now() } : null
}

/**
 * ยึด section เดิมไว้ที่ตำแหน่งเดิมบนจอ ต่อเนื่องจนเนื้อหามาครบ
 *
 * แก้ครั้งเดียวไม่พอ เพราะหน้าที่มี loading.tsx จะขึ้นสเกลเลตันก่อนแล้วเนื้อหาจริงตามมาทีหลัง
 * ถ้าวัดตอนที่ยังเป็นสเกลเลตัน เอกสารยังสั้นอยู่ ตำแหน่งที่คำนวณได้จึงผิด
 * ทดสอบบนหน้ารายละเอียดบริการแล้วเลื่อนผิดไป 309px ทั้งที่โค้ดทำงานถูกทุกบรรทัด
 *
 * จึงยึดต่อเนื่องทุกเฟรมจนกว่าจะครบเวลา และหยุดทันทีที่ผู้ใช้ขยับหน้าเอง
 * ไม่มีเหตุผลที่จะไปแย่งควบคุม scroll จากคนที่กำลังใช้งานอยู่
 */
function keepAnchored({ index, offset }: ScrollAnchor, budgetMs = 1200) {
  const deadline = performance.now() + budgetMs
  let expected = window.scrollY
  let frame = 0
  let stopped = false

  const stop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(frame)
    for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
      window.removeEventListener(type, stop)
    }
    window.removeEventListener('scroll', onScroll)
  }

  // ถ้าตำแหน่งเปลี่ยนไปโดยที่ไม่ใช่ฝีมือเรา แปลว่าผู้ใช้เลื่อนเอง
  const onScroll = () => {
    if (Math.abs(window.scrollY - expected) > 2) stop()
  }

  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
    window.addEventListener(type, stop, { passive: true })
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  const tick = () => {
    if (stopped) return

    const target = renderedSections()[index]
    if (target) {
      const delta = target.getBoundingClientRect().top - offset
      if (Math.abs(delta) >= 1) {
        // instant เพราะ html ตั้ง scroll-smooth ไว้ ถ้าปล่อยให้ค่อย ๆ เลื่อนจะกลายเป็นการกระตุกอีกแบบ
        expected = window.scrollY + delta
        window.scrollTo({ top: expected, behavior: 'instant' })
        // เบราว์เซอร์อาจตรึงค่าไว้ถ้าเอกสารยังสั้นกว่าที่ขอ จึงยึดค่าจริงเป็นหลัก
        expected = window.scrollY
      }
    }

    if (performance.now() < deadline) frame = requestAnimationFrame(tick)
    else stop()
  }

  frame = requestAnimationFrame(tick)
  return stop
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('locale')
  const active = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  /**
   * ดึงหน้าอีกภาษามารอไว้ตั้งแต่ก่อนกด
   *
   * ที่รู้สึกว่า "กระตุก" ส่วนใหญ่คือช่วงที่หน้าค้างหรี่รอ RSC payload จากเซิร์ฟเวอร์
   * บนเครื่องเราใช้เวลา 15ms แต่บน production หน้าเดียวกันใช้เวลาเป็นวินาที
   * โหลดรอไว้ก่อนทำให้ตอนกดจริงเหลือแค่การสลับ DOM
   */
  useEffect(() => {
    const other = locales.find((locale) => locale !== active)
    if (other) router.prefetch(pathname, { locale: other })
  }, [active, pathname, router])

  /**
   * หรี่เนื้อหาลงระหว่างรอหน้าใหม่ แล้วคืนกลับเมื่อเสร็จ
   * ทำผ่าน attribute บน <html> เพราะ CSS เข้าถึงได้ทั้งต้นไม้โดยไม่ต้องส่ง state ลงไปทุกชั้น
   */
  useEffect(() => {
    document.documentElement.dataset.localeSwitching = String(isPending)
    return () => {
      delete document.documentElement.dataset.localeSwitching
    }
  }, [isPending])

  /**
   * พอเนื้อหาภาษาใหม่ขึ้นจอแล้ว ค่อยดึง scroll กลับไปที่จุดเดิม
   *
   * เช็คทั้งตอน mount ใหม่ (กรณีปกติที่ layout ถูกสร้างใหม่ทั้งชุด)
   * และตอน isPending กลับเป็น false (เผื่อ React reuse subtree เดิม)
   *
   * ต้องรอถึงเฟรมถัดไปเพราะจังหวะที่ effect ทำงาน React commit DOM แล้ว
   * แต่เบราว์เซอร์ยังไม่ได้คำนวณ layout ใหม่ ค่า getBoundingClientRect จะยังเป็นของเก่า
   */
  useEffect(() => {
    if (isPending) return

    const anchor = takeAnchor()
    // กันเคสที่ผู้ใช้กดสลับแล้วปิดแท็บไว้นาน กลับมาอีกทีไม่ควรโดนดึง scroll แบบไม่มีที่มา
    if (!anchor || Date.now() - anchor.at > 5000) return

    return keepAnchored(anchor)
  }, [isPending])

  const switchTo = (next: Locale) => {
    if (next === active) return

    /**
     * ข้อความไทยยาวกว่าอังกฤษ วัดที่หน้าแรกได้ว่า hero สูงต่างกัน 151px
     * และทั้งหน้าต่างกัน 277px ถ้าไม่ทำอะไรเลย ทุกอย่างใต้จุดที่อ่านอยู่จะกระโดดลง
     */
    saveAnchor(readAnchor())

    startTransition(() => {
      // usePathname ของ next-intl คืนค่าโดยตัด prefix ภาษาออกแล้ว จึงอยู่หน้าเดิมหลังสลับภาษา
      //
      // scroll: false สำคัญมาก — ค่าเริ่มต้นของ Next คือดีดกลับไปหัวหน้าทุกครั้งที่เปลี่ยน route
      // คนที่อ่านอยู่กลางหน้าแล้วกดสลับภาษาจะเสียตำแหน่งที่อ่านค้างไว้ทันที
      router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: next, scroll: false })
    })
  }

  return (
    <div
      role="group"
      aria-label={t('switch')}
      aria-busy={isPending}
      className={cn(
        'inline-flex items-center rounded-md border border-border p-0.5',
        isPending && 'opacity-60',
        className,
      )}
    >
      {locales.map((locale) => {
        const isActive = locale === active
        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchTo(locale)}
            disabled={isPending}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              // ล็อกความกว้างไว้เท่ากันทั้งสองปุ่ม ("ไทย" กับ "EN" กว้างไม่เท่ากัน)
              // ไม่งั้นตอนสลับภาษา ฟอนต์เปลี่ยน ความกว้างปุ่มเปลี่ยน แล้วดันของใน header ทั้งแถว
              'min-h-11 min-w-11 rounded-[5px] py-1 text-center text-sm font-medium transition-colors',
              isActive
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {localeLabels[locale].short}
          </button>
        )
      })}
    </div>
  )
}
