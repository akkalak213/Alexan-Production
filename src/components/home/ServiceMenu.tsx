import { Aperture, ArrowUpRight, Monitor } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from '@/i18n/navigation'
import { ServiceIcon } from '@/components/ui/ServiceIcon'

export type ServiceMenuGroup = {
  id: 'digital' | 'visual'
  label: string
  items: {
    id: string
    href: string
    icon: string
    title: string
    tagline: string
    price?: { from?: string; amount: string; unit?: string }
  }[]
}

const groupIcons = { digital: Monitor, visual: Aperture }

/**
 * บริการทั้งหมดในรูปแบบรายการราคา ไม่ใช่กริดการ์ด
 *
 * คนที่เข้าหน้าแรกอยากรู้สองอย่างก่อนกดอ่านต่อ: ทำอะไรได้ และเริ่มต้นที่เท่าไหร่
 * แถวเดียวตอบทั้งสองอย่างได้ในสายตาเดียว และไล่อ่านบนมือถือได้ง่ายกว่าการ์ดที่ต้องเลื่อนผ่านทีละใบ
 */
export function ServiceMenu({ groups }: { groups: ServiceMenuGroup[] }) {
  return (
    <div className="service-menu">
      {groups
        .filter((group) => group.items.length > 0)
        .map((group, groupIndex) => {
          const Icon = groupIcons[group.id]
          return (
            <div
              key={group.id}
              className="service-group"
              data-enter
              style={{ '--entry-delay': `${groupIndex * 100}ms` } as CSSProperties}
            >
              <h3 className="service-group-label">
                <Icon size={18} strokeWidth={1.6} aria-hidden />
                {group.label}
              </h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="service-row">
                      <span className="service-row-icon">
                        <ServiceIcon name={item.icon} size={20} strokeWidth={1.6} aria-hidden />
                      </span>
                      <span className="service-row-text">
                        <strong>{item.title}</strong>
                        <span>{item.tagline}</span>
                      </span>
                      {item.price && (
                        <span className="service-row-price">
                          {item.price.from && <small>{item.price.from}</small>}
                          <b>{item.price.amount}</b>
                          {item.price.unit && <small>{item.price.unit}</small>}
                        </span>
                      )}
                      <ArrowUpRight size={18} aria-hidden className="service-row-arrow" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
    </div>
  )
}
