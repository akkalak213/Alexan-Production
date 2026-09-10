import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { LeadForm } from '@/components/forms/LeadForm'
import { formatPrice, toNumber } from '@/lib/format'
import { getSiteSettings } from '@/lib/settings'
import { safeExternalUrl } from '@/lib/external-link'
import { budgetRangeFor } from '@/lib/validations'
import { getPackageForQuote } from '@/server/queries'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema, webPageSchema } from '@/lib/structured-data'

/**
 * เรนเดอร์ตอนมีคนขอ ไม่ prerender ตอน build
 *
 * ตอน build บน Railway ยังต่อฐานข้อมูลไม่ได้ (private network เปิดหลัง deploy)
 * เดิมใช้ ISR โดยหวังว่าหน้าจะรีเฟรชตัวเองหลังขึ้นระบบ แต่ผลจริงคือ
 * หน้าที่ prerender ด้วยข้อมูลเปล่าถูกแคชไว้และเสิร์ฟไปอีกสิบนาทีเต็มหลัง deploy ทุกครั้ง
 * ส่วนที่ผูกกับข้อมูลจึงหายไปทั้งก้อนในช่วงนั้น
 *
 * ฐานข้อมูลอยู่บน private network แล้ว วัดได้ 165ms จากเดิม 859ms
 * การอ่านสดทุกครั้งจึงถูกกว่าการเสี่ยงเสิร์ฟหน้าเปล่า
 */
export const dynamic = 'force-dynamic'


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })

  return pageMetadata({
    locale,
    path: '/contact',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ package?: string }>
}) {
  const { locale } = await params
  const { package: packageId } = await searchParams
  setRequestLocale(locale)

  const [t, tc, tNav, settings, pkg] = await Promise.all([
    getTranslations('contact'),
    getTranslations('common'),
    getTranslations('nav'),
    getSiteSettings(),
    packageId ? getPackageForQuote(packageId) : null,
  ])
  const { company, social } = settings
  const isThai = locale === 'th'

  /**
   * แพ็กเกจที่ลูกค้ากดมาจากหน้าบริการ
   *
   * URL ส่งมาแค่ id แล้วอ่านชื่อกับราคาจากฐานข้อมูลที่นี่
   * ราคาจึงเป็นค่าจริงเสมอ แก้จากแถบที่อยู่ไม่ได้ และไม่ต้องพึ่ง JavaScript ฝั่งหน้าบริการ
   */
  const priceUnitLabel: Record<string, string> = {
    PROJECT: tc('perProject'),
    DAY: tc('perDay'),
    HALF_DAY: tc('perHalfDay'),
    HOUR: tc('perHour'),
    MONTH: tc('perMonth'),
    PERSON: tc('perPerson'),
    CUSTOM: '',
  }

  const price = pkg ? formatPrice(pkg.priceFrom, locale) : null
  const initialPackage = pkg
    ? {
        id: pkg.id,
        name: isThai ? pkg.nameTh : pkg.nameEn,
        serviceName: isThai ? pkg.service.titleTh : pkg.service.titleEn,
        priceTag: price
          ? [pkg.isStartingPrice ? tc('startingFrom') : null, price, priceUnitLabel[pkg.priceUnit]]
              .filter(Boolean)
              .join(' ')
          : tc('customPrice'),
        budgetRange: budgetRangeFor(toNumber(pkg.priceFrom)),
      }
    : null

  /**
   * ลิงก์ LINE ใช้เฉพาะค่าที่ตั้งไว้ใน social.line และผ่านการกรอง scheme แล้วเท่านั้น
   * ถ้ามีแต่ ID จะแสดงเป็นข้อความพร้อมป้ายกำกับ ไม่ปั้นลิงก์เดาเอาจากชื่อบัญชี
   */
  const lineHref = safeExternalUrl(social.line)

  const details = [
    company.email && { icon: Mail, value: company.email, href: `mailto:${company.email}` },
    company.phone && {
      icon: Phone,
      value: company.phone,
      href: `tel:${company.phone.replace(/\s/g, '')}`,
    },
    (company.lineId || lineHref) && {
      icon: MessageCircle,
      value: company.lineId || lineHref,
      href: lineHref,
      note: lineHref ? undefined : t('lineIdNote'),
    },
    { icon: MapPin, value: isThai ? company.addressTh : company.addressEn, href: null },
  ].filter(Boolean) as { icon: typeof Mail; value: string; href: string | null; note?: string }[]

  return (
    <>
      {/*
        ContactPage บอกเครื่องมือค้นหาว่าหน้านี้คือ "ทางติดต่อ" ของกิจการ ไม่ใช่หน้าเนื้อหาทั่วไป
        เป็นสิ่งที่ AI ใช้ตัดสินว่าจะส่งคนที่ถามว่า "ติดต่อยังไง" มาที่หน้านี้หรือไปหน้าอื่น
        ส่วนเบอร์ อีเมล และที่อยู่จริงประกาศไว้ที่กิจการใน layout แล้ว ไม่ประกาศซ้ำ
      */}
      <JsonLd
        data={webPageSchema({
          type: 'ContactPage',
          name: t('title'),
          description: t('subtitle'),
          path: '/contact',
          locale,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('contact'), path: localizedPath(locale, '/contact') },
        ])}
      />

    <section className="py-16 md:py-24">
      <div className="container">
        {/* stage ไล่จังหวะให้หัวเรื่องทีละชิ้นเหมือนหน้าแรก หน้านี้คือหน้าที่ลูกค้าตัดสินใจ */}
        <div className="stage max-w-2xl">
          <p className="rule-draw mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">
            {t('eyebrow')}
          </p>
          <h1 className="sweep font-display text-display-lg text-balance">{t('title')}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            {t('subtitle')}
          </p>
        </div>

        <div className="reveal-stagger mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
          {/*
            จุดหมายของลิงก์ "เลือกแพ็กเกจนี้" จากหน้าบริการ
            พาลูกค้ามาหยุดตรงฟอร์มพร้อมสรุปแพ็กเกจที่เลือก ไม่ใช่ปล่อยไว้บนหัวเรื่องแล้วต้องหาเอง
          */}
          <div
            id="lead-form"
            className="scroll-mt-24 rounded-lg border border-border bg-surface p-7 md:p-9"
          >
            <h2 className="mb-7 font-display text-2xl">{t('formTitle')}</h2>
            <LeadForm
              source={initialPackage ? 'QUOTE' : 'CONTACT'}
              initialPackage={initialPackage}
              defaultService={pkg?.service.category}
            />
          </div>

          <aside className="space-y-10">
            <div>
              <h2 className="mb-5 text-sm font-medium">{t('directTitle')}</h2>
              <ul className="space-y-4">
                {details.map(({ icon: Icon, value, href, note }) => (
                  <li key={value} className="flex gap-3">
                    <Icon
                      size={17}
                      strokeWidth={1.75}
                      aria-hidden
                      className="mt-0.5 shrink-0 text-accent"
                    />
                    {href ? (
                      <a
                        href={href}
                        className="text-sm text-muted-foreground transition-colors hover:text-accent"
                      >
                        {value}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground text-pretty">
                        {value}
                        {note && (
                          <span className="mt-0.5 block text-xs text-muted-foreground/80">
                            {note}
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-4 text-sm font-medium">{t('hoursTitle')}</h2>
              <p className="flex gap-3 text-sm text-muted-foreground">
                <Clock size={17} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                {isThai ? company.openingHoursTh : company.openingHoursEn}
              </p>
            </div>

            <p className="rounded-md border border-border bg-subtle p-4 text-sm text-muted-foreground text-pretty">
              {t('responseNote')}
            </p>
          </aside>
        </div>
      </div>
    </section>
    </>
  )
}
