'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { StudioMotion } from './studio-motion'

/**
 * ครอบฉากสตูดิโอ ให้แอนิเมชันเล่นเฉพาะตอนที่มองเห็น และมีปุ่มให้หยุดเองได้
 *
 * ฉากวนไม่รู้จบ เกณฑ์ WCAG 2.2.2 จึงต้องมีทางหยุด ปุ่มนี้คือทางนั้น
 * การหยุดตอนเลื่อนพ้นจอทำเพื่อไม่ให้เบราว์เซอร์วาดฉากที่ไม่มีใครเห็นอยู่ทิ้งไว้เปล่า ๆ
 *
 * ตัวแอนิเมชัน (GSAP) อยู่ใน studio-motion.ts และโหลดด้วย import() หลังคอมโพเนนต์นี้พร้อมแล้ว
 * GSAP จึงไม่ถ่วง JavaScript ก้อนแรกของหน้าแรก ถ้าโหลดไม่มา CSS เปิดฉากนิ่งให้เองหลังรอสักครู่
 * คนที่ตั้งค่าลดการเคลื่อนไหวไว้จะไม่เห็นทั้งแอนิเมชันและปุ่ม (คุมใน CSS และใน studio-motion.ts)
 */
export function StudioStage({
  children,
  pauseLabel,
  playLabel,
}: {
  children: ReactNode
  pauseLabel: string
  playLabel: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const motion = useRef<StudioMotion | null>(null)
  const [onScreen, setOnScreen] = useState(true)
  const [stopped, setStopped] = useState(false)
  const running = onScreen && !stopped
  const runningRef = useRef(running)

  useEffect(() => {
    const element = root.current
    if (!element || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: '160px 0px',
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = root.current
    if (!element) return
    let cancelled = false

    import('./studio-motion')
      .then(({ startStudioMotion }) => {
        if (cancelled) return
        motion.current = startStudioMotion(element)
        motion.current.setRunning(runningRef.current)
      })
      // โหลดไม่มา (เน็ตหลุด) ฉากนิ่งยังแสดงครบ ไม่ต้องทำอะไรเพิ่ม
      .catch(() => {})

    return () => {
      cancelled = true
      motion.current?.destroy()
      motion.current = null
    }
  }, [])

  useEffect(() => {
    runningRef.current = running
    motion.current?.setRunning(running)
  }, [running])

  const label = stopped ? playLabel : pauseLabel

  return (
    <div ref={root} className="studio-stage" data-motion={running ? 'running' : 'paused'}>
      {children}
      <div className="container studio-stage-controls">
        <button
          type="button"
          className="studio-motion-toggle"
          onClick={() => setStopped((value) => !value)}
          aria-label={label}
          title={label}
        >
          {stopped ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
        </button>
      </div>
    </div>
  )
}
