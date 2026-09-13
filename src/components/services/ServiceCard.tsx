import { ArrowUpRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ServiceIcon } from '@/components/ui/ServiceIcon'

type Props = {
  service: { slug: string; icon: string; titleTh: string; titleEn: string; taglineTh: string; taglineEn: string }
  locale: Locale
  index: number
  actionLabel: string
  headingAs?: 'h2' | 'h3'
}

export function ServiceCard({ service, locale, index, actionLabel, headingAs: Heading = 'h3' }: Props) {
  const isThai = locale === 'th'
  return (
    <Link href={`/services/${service.slug}`} className="service-tile group">
      <div className="service-tile-top">
        <span className="service-number" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
        <ServiceIcon name={service.icon} size={25} strokeWidth={1.4} />
      </div>
      <Heading className="font-display text-2xl">{isThai ? service.titleTh : service.titleEn}</Heading>
      <p className="text-pretty">{isThai ? service.taglineTh : service.taglineEn}</p>
      <span className="service-tile-link">{actionLabel}<ArrowUpRight size={19} aria-hidden /></span>
    </Link>
  )
}
