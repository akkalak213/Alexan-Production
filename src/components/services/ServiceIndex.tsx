import { ArrowUpRight, Check } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ContentImage } from '@/components/ui/ContentImage'
import type { StartingPrice } from '@/lib/service-pricing'

export type ServiceIndexGroup = {
  id: string
  label: string
  countLabel: string
  items: {
    id: string
    href: string
    title: string
    tagline: string
    highlights: string[]
    price?: StartingPrice
    /** ภาพตัวอย่างที่โผล่ตอนชี้ ไม่มีก็ได้ แถวยังอ่านครบด้วยตัวอักษรอย่างเดียว */
    image?: string
  }[]
}

/**
 * หน้ารวมบริการแบบสารบัญ ไม่ใช่กริดการ์ดไอคอน
 *
 * แต่ละแถวตอบครบในสายตาเดียว: ทำอะไร ได้อะไรบ้าง เริ่มต้นเท่าไหร่
 * บริการที่มีผลงานจริงจะมีภาพตัวอย่างลอยขึ้นมาตอนชี้ ภาพเป็นของแถม ไม่ใช่ส่วนที่แถวต้องพึ่ง
 * บริการที่ยังไม่มีผลงานจึงไม่ต้องมีช่องภาพว่าง ๆ หรือไอคอนแทนภาพที่ดูเป็นเทมเพลต
 */
export function ServiceIndex({
  groups,
  unavailableLabel,
}: {
  groups: ServiceIndexGroup[]
  unavailableLabel: string
}) {
  const visible = groups.filter((group) => group.items.length > 0)
  // เลขลำดับนับต่อกันข้ามกลุ่ม สารบัญทั้งหน้าจึงอ่านเป็นชุดเดียว
  const offsets = visible.map((_, index) => visible.slice(0, index).reduce((sum, group) => sum + group.items.length, 0))

  return (
    <div className="svc-index">
      {visible.map((group, groupIndex) => (
        <section key={group.id} aria-labelledby={`svc-group-${group.id}`} className="svc-group">
          <header className="svc-group-head">
            <h2 id={`svc-group-${group.id}`}>{group.label}</h2>
            <span>{group.countLabel}</span>
          </header>
          <ol>
            {group.items.map((item, index) => (
              <li key={item.id}>
                <Link href={item.href} className="svc-entry">
                  <span className="svc-entry-no" aria-hidden>
                    {String(offsets[groupIndex] + index + 1).padStart(2, '0')}
                  </span>
                  <div className="svc-entry-main">
                    <h3 className="svc-entry-title font-display">{item.title}</h3>
                    <p className="svc-entry-tagline">{item.tagline}</p>
                    {item.highlights.length > 0 && (
                      <ul className="svc-entry-points">
                        {/* ข้อความอิสระที่แอดมินพิมพ์เอง ซ้ำกันได้ จึงยึดลำดับเป็น key */}
                        {item.highlights.slice(0, 3).map((point, pointIndex) => (
                          <li key={pointIndex}>
                            <Check size={14} strokeWidth={2.2} aria-hidden />
                            {point}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {item.price && (
                    <p className="svc-entry-price">
                      {item.price.from && <small>{item.price.from}</small>}
                      <b>{item.price.amount}</b>
                      {item.price.unit && <small>{item.price.unit}</small>}
                    </p>
                  )}
                  <span className="svc-entry-arrow" aria-hidden>
                    <ArrowUpRight size={20} strokeWidth={1.75} />
                  </span>
                  {item.image && (
                    <span className="svc-entry-peek" aria-hidden>
                      <ContentImage
                        src={item.image}
                        alt=""
                        fill
                        sizes="280px"
                        className="object-cover"
                        unavailableLabel={unavailableLabel}
                      />
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
