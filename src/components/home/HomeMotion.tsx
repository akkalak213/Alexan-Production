'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * เนื้อหาแต่ละก้อนค่อย ๆ เลื่อนขึ้นมาตอนเลื่อนถึง เล่นครั้งเดียวต่อก้อน
 *
 * เนื้อหาแสดงครบตั้งแต่ HTML มาถึง ไม่ต้องรอ JavaScript
 * ตอนสคริปต์พร้อมจะซ่อนเฉพาะก้อนที่ยังอยู่ใต้จอ ก้อนที่อยู่บนจออยู่แล้วปล่อยไว้ตามเดิม
 * ของเดิมสั่งทุกก้อนให้เล่นจากจางตอนเลื่อนถึง ทั้งที่มันแสดงอยู่แล้ว
 * คนดูจึงเห็นเนื้อหาหายวูบแล้วค่อยลอยกลับมา
 */
export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-entered', '')
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    )

    for (const target of element.querySelectorAll<HTMLElement>('[data-enter], .section-header')) {
      if (target.getBoundingClientRect().top < window.innerHeight) continue
      target.setAttribute('data-enter', 'pending')
      observer.observe(target)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={root} className="home-page">
      {children}
    </div>
  )
}
