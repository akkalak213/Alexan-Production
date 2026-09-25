import { ArrowUpRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { buttonClasses } from '@/components/ui/Button'

type Props = {
  id?: string
  eyebrow?: string
  title: string
  subtitle?: string
  actionLabel: string
  href?: string
  note?: string
}

/**
 * แถบสีทองแดงชวนคุยงานท้ายหน้า ใช้แบบเดียวกันทั้งเว็บ
 * ปิดท้ายทุกหน้าด้วยคำชวนหน้าตาเดียวกัน คนอ่านจึงจำได้ว่าตรงนี้คือทางไปคุยกับทีม
 */
export function ContactBand({ id = 'contact-band-title', eyebrow, title, subtitle, actionLabel, href = '/contact', note }: Props) {
  return (
    <section aria-labelledby={id} className="home-contact">
      <div className="container">
        <div className="contact-band" data-enter>
          <div>
            {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
            <h2 id={id} className="font-display text-balance">
              {title}
            </h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="contact-band-action">
            <Link href={href} className={buttonClasses('primary', 'lg')}>
              {actionLabel}
              <ArrowUpRight size={19} aria-hidden />
            </Link>
            {note && <small>{note}</small>}
          </div>
        </div>
      </div>
    </section>
  )
}
