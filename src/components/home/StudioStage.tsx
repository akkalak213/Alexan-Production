'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * ครอบฉากสตูดิโอ ให้แอนิเมชันเล่นเฉพาะตอนที่มองเห็น และมีปุ่มให้หยุดเองได้
 *
 * ฉากวนไม่รู้จบ เกณฑ์ WCAG 2.2.2 จึงต้องมีทางหยุด ปุ่มนี้คือทางนั้น
 * รอบก่อนแก้ปัญหานี้ด้วยการปิดแอนิเมชันทั้งฉากทิ้ง ฉากจึงนิ่งสนิท
 *
 * ส่วนการหยุดตอนเลื่อนพ้นจอ ทำเพื่อไม่ให้เบราว์เซอร์วาดลำแสงที่เบลออยู่ทิ้งไว้เปล่า ๆ
 * ค่าเริ่มต้นเป็น "เล่น" ทั้งฝั่ง server และ client ค่าจึงตรงกันตอน hydrate
 * คนที่ตั้งค่าลดการเคลื่อนไหวไว้จะไม่เห็นทั้งแอนิเมชันและปุ่ม (คุมใน CSS)
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
  const [onScreen, setOnScreen] = useState(true)
  const [stopped, setStopped] = useState(false)

  useEffect(() => {
    const element = root.current
    if (!element || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: '160px 0px',
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const label = stopped ? playLabel : pauseLabel

  return (
    <div ref={root} className="studio-stage" data-motion={onScreen && !stopped ? 'running' : 'paused'}>
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
