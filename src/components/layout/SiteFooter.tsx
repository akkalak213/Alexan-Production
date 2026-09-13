import { Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Youtube } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { LineIcon, TikTokIcon } from '@/components/ui/BrandIcons'
import { safeExternalUrl } from '@/lib/external-link'
import { getSiteSettings } from '@/lib/settings'
import { Wordmark } from './Wordmark'

const serviceLinks = [
  { key: 'WEB', href: '/services/web' },
  { key: 'WEB_APP', href: '/services/web-app' },
  { key: 'MOBILE_APP', href: '/services/mobile-app' },
  { key: 'PHOTOGRAPHY', href: '/services/photography' },
  { key: 'VIDEO', href: '/services/video' },
  { key: 'STUDIO', href: '/services/studio' },
] as const

const companyLinks = [
  { key: 'about', href: '/about' },
  { key: 'work', href: '/work' },
  { key: 'rental', href: '/rental' },
  { key: 'reviews', href: '/reviews' },
  { key: 'blog', href: '/blog' },
  { key: 'contact', href: '/contact' },
] as const

/**
 * ต้องครบทุกช่องที่หลังบ้านให้กรอกได้ ไม่งั้นกรอกลิงก์ไปแล้วปุ่มไม่ขึ้น
 * TikTok หายไปทั้งที่หน้าตั้งค่ามีช่องให้กรอก — lucide ไม่มีไอคอนโลโก้ให้ จึงวาดเอง
 */
const socials = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { key: 'line', label: 'LINE', Icon: LineIcon },
] as const

export async function SiteFooter() {
  const [t, tNav, tCat, locale, settings] = await Promise.all([
    getTranslations('footer'),
    getTranslations('nav'),
    getTranslations('serviceCategory'),
    getLocale(),
    getSiteSettings(),
  ])

  const isThai = locale === 'th'
  const { company, social } = settings
  const address = isThai ? company.addressTh : company.addressEn
  const hours = isThai ? company.openingHoursTh : company.openingHoursEn

  /**
   * ตัดลิงก์ซ้ำออก
   *
   * เกิดขึ้นจริงมาแล้ว: ตอนที่ปุ่ม TikTok ยังไม่ทำงาน มีการเอาลิงก์ TikTok ไปใส่ในช่อง LINE แทน
   * พอปุ่ม TikTok ใช้ได้ ฟุตเตอร์จะมีสองปุ่มที่พาไปที่เดียวกัน ซึ่งดูเหมือนเว็บพัง
   * เก็บอันแรกที่เจอไว้ตัวเดียวพอ แล้วค่อยไปแก้ค่าที่หน้าตั้งค่าให้ถูกทีหลัง
   */
  const seen = new Set<string>()
  const socialLinks = socials
    // กรอง scheme ก่อนเสมอ — ค่ามาจากหน้าตั้งค่า ไม่ใช่ค่าที่เขียนไว้ในโค้ด
    .map((item) => ({ ...item, url: safeExternalUrl(social[item.key]) }))
    // type predicate เพราะ filter ธรรมดาไม่ narrow ชนิดให้ url พ้นจาก null
    .filter((item): item is typeof item & { url: string } => {
      if (!item.url || seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })

  return (
    <footer className="site-footer border-t border-border bg-subtle no-print">
      {/*
        ฟุตเตอร์เคยสูง 1252px บนมือถือ ซึ่งเป็น 1.54 เท่าของความสูงจอ และกินพื้นที่ 24% ของทั้งหน้า
        ต้นเหตุคือทุกบล็อกวางซ้อนกันเป็นคอลัมน์เดียวและระยะห่างตั้งไว้เท่าหน้าเนื้อหา
        รอบนี้จับสองคอลัมน์ลิงก์มาอยู่ข้างกันตั้งแต่จอเล็ก และลดระยะทั้งหมดลง
      */}
      <div className="container py-12 md:py-14">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="col-span-2 lg:col-span-1">
            <Wordmark />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              {t('aboutBlurb')}
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-5">
                <p className="sr-only">{t('followHeading')}</p>
                <ul className="flex gap-2">
                  {socialLinks.map(({ key, label, url, Icon }) => (
                    <li key={key}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        // ชื่อแพลตฟอร์มจริง ไม่ใช่คีย์ในโค้ด — screen reader อ่านออกเสียงตัวนี้
                        aria-label={label}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        <Icon size={16} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <nav aria-labelledby="footer-services">
            <h2 id="footer-services" className="mb-3 text-sm font-medium">
              {t('servicesHeading')}
            </h2>
            <ul className="space-y-2">
              {serviceLinks.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-accent"
                  >
                    {tCat(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-company">
            <h2 id="footer-company" className="mb-3 text-sm font-medium">
              {t('companyHeading')}
            </h2>
            <ul className="space-y-2">
              {companyLinks.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-accent"
                  >
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-2 lg:col-span-1">
            <h2 className="mb-3 text-sm font-medium">{t('contactHeading')}</h2>
            <ul className="grid gap-x-6 gap-y-2.5 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-1">
              {company.email && (
                <li className="flex gap-2.5">
                  <Mail size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  <a href={`mailto:${company.email}`} className="transition-colors hover:text-accent">
                    {company.email}
                  </a>
                </li>
              )}
              {company.phone && (
                <li className="flex gap-2.5">
                  <Phone size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  <a
                    href={`tel:${company.phone.replace(/\s/g, '')}`}
                    className="transition-colors hover:text-accent"
                  >
                    {company.phone}
                  </a>
                </li>
              )}
              {company.lineId && (
                <li className="flex gap-2.5">
                  <MessageCircle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  <span>{company.lineId}</span>
                </li>
              )}
              {address && (
                <li className="flex gap-2.5">
                  <MapPin size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  <span className="text-pretty">{address}</span>
                </li>
              )}
              {hours && (
                <li className="flex gap-2.5">
                  <Clock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  <span>
                    <span className="sr-only">{t('openingHours')}: </span>
                    {hours}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {isThai ? company.nameTh : company.nameEn}. {t('rights')}
          </p>
          <ul className="flex gap-6">
            <li>
              <Link href="/privacy" className="transition-colors hover:text-accent">
                {t('privacy')}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition-colors hover:text-accent">
                {t('terms')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
