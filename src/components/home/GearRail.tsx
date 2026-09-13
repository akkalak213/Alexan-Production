'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * ชั้นวางอุปกรณ์แบบเลื่อนแนวนอน
 *
 * มือถือปัดด้วยนิ้วผ่าน scroll-snap ของเบราว์เซอร์ ไม่มี JavaScript มาดักการเลื่อน
 * บนคอมมีปุ่มซ้ายขวาสำหรับคนที่ใช้เมาส์ ปุ่มปิดตัวเองเมื่อสุดทาง
 * ถ้ารายการพอดีจอไม่ต้องเลื่อน ปุ่มจะไม่แสดงเลย
 */
export function GearRail({
  children,
  label,
  countLabel,
  previousLabel,
  nextLabel,
}: {
  children: ReactNode
  label: string
  countLabel: string
  previousLabel: string
  nextLabel: string
}) {
  const track = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  useEffect(() => {
    const element = track.current
    if (!element) return
    const measure = () => {
      const max = element.scrollWidth - element.clientWidth
      setEdge({ start: element.scrollLeft <= 4, end: element.scrollLeft >= max - 4 })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', measure)
    }
  }, [])

  const move = (direction: 1 | -1) => {
    const element = track.current
    if (!element) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className="gear-rail">
      <div className="gear-rail-head">
        <p>{countLabel}</p>
        {!(edge.start && edge.end) && (
          <div className="gear-rail-buttons">
            <button type="button" onClick={() => move(-1)} disabled={edge.start} aria-label={previousLabel}>
              <ArrowLeft size={18} aria-hidden />
            </button>
            <button type="button" onClick={() => move(1)} disabled={edge.end} aria-label={nextLabel}>
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>
      <ul ref={track} className="gear-rail-track" aria-label={label}>
        {children}
      </ul>
    </div>
  )
}
