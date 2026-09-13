'use client'

import { useState } from 'react'
import { ContentImage } from '@/components/ui/ContentImage'

type Shot = { id: string; url: string; label: string }

/**
 * หน้าจอจริงของงานดิจิทัล สลับดูได้ทีละภาพ
 *
 * ไม่เลื่อนเอง คนดูเป็นคนเลือกว่าจะดูหน้าไหนและนานแค่ไหน
 * ชี้ที่หน้าจอแล้วภาพจะค่อย ๆ เลื่อนลงจนสุดหน้า (CSS) เหมือนกำลังไล่ดูเว็บนั้นอยู่
 */
export function CaseStudyViewer({
  shots,
  host,
  listLabel,
  unavailableLabel,
}: {
  shots: Shot[]
  host?: string
  listLabel: string
  unavailableLabel: string
}) {
  const [active, setActive] = useState(0)
  const current = shots[Math.min(active, shots.length - 1)]
  if (!current) return null

  return (
    <div className="case-viewer">
      <div className="case-window">
        <div className="case-bar" aria-hidden>
          <i />
          <i />
          <i />
          {host && <span>{host}</span>}
        </div>
        <div className="case-screen">
          <ContentImage
            src={current.url}
            alt={current.label}
            unavailableLabel={unavailableLabel}
            fill
            sizes="(min-width: 1360px) 760px, (min-width: 1024px) 56vw, 100vw"
            className="object-cover object-top"
          />
        </div>
      </div>

      {shots.length > 1 && (
        <div className="case-thumbs" role="group" aria-label={listLabel}>
          {shots.map((shot, index) => (
            <button
              key={shot.id}
              type="button"
              aria-pressed={index === active}
              aria-label={shot.label}
              onClick={() => setActive(index)}
            >
              <ContentImage
                src={shot.url}
                alt=""
                unavailableLabel=""
                fill
                sizes="7rem"
                className="object-cover object-top"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
