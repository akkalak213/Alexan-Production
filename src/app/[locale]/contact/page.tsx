import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { LeadForm } from '@/components/forms/LeadForm'
import { equipmentName, formatPrice, toNumber } from '@/lib/format'
import { parseRentalDays } from '@/lib/rental-request'
import { getSiteSettings } from '@/lib/settings'
import { safeExternalUrl } from '@/lib/external-link'
import { budgetRangeFor } from '@/lib/validations'
import { getEquipmentByIds, getPackageForQuote } from '@/server/queries'
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
  searchParams: Promise<{ package?: string; items?: string; days?: string }>
}) {
  const { locale } = await params
  const { package: packageId, items, days } = await searchParams
  setRequestLocale(locale)

  // อุปกรณ์ที่ส่งต่อมาจากใบเสนอราคาเบื้องต้น — URL มีแค่ id เรตอ่านจากฐานข้อมูลเสมอ
  const equipmentIds = [...new Set((items ?? '').split(',').map((id) => id.trim()).filter(Boolean))].slice(0, 30)

  const [t, tc, tNav, settings, pkg, equipment] = await Promise.all([
    getTranslations('contact'),
    getTranslations('common'),
    getTranslations('nav'),
    getSiteSettings(),
    packageId ? getPackageForQuote(packageId) : null,
    getEquipmentByIds(equipmentIds),
  ])
  const { company, social } = settings
  const isThai = locale === 'th'

  const rental = equipment.length
    ? {
        items: equipment.map((item) => ({
          id: item.id,
          label: equipmentName(item.brand, item.model),
          dailyRate: toNumber(item.dailyRate),
          weeklyRate: toNumber(item.weeklyRate),
          deposit: toNumber(item.depositAmount),
        })),
        days: parseRentalDays(days),
      }
    : undefined

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

  const address = isThai ? company.addressTh : company.addressEn
  const details = [
    company.email && { icon: Mail, label: t('labelEmail'), value: company.email, href: `mailto:${company.email}` },
    company.phone && {
      icon: Phone,
      label: t('labelPhone'),
      value: company.phone,
      href: `tel:${company.phone.replace(/\s/g, '')}`,
    },
    (company.lineId || lineHref) && {
      icon: MessageCircle,
      label: t('labelLine'),
      value: company.lineId || lineHref,
      href: lineHref,
      note: lineHref ? undefined : t('lineIdNote'),
    },
    // ที่อยู่เปิดในแผนที่ได้ในคลิกเดียว คนที่จะมาสตูดิโอไม่ต้องคัดลอกไปวางเอง
    address && {
      icon: MapPin,
      label: t('labelAddress'),
      value: address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      note: t('openMap'),
      external: true,
    },
  ].filter(Boolean) as {
    icon: typeof Mail
    label: string
    value: string
    href: string | null
    note?: string
    external?: boolean
  }[]

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
        <div className="stage max-w-3xl">
          <p className="section-eyebrow mb-4">{t('eyebrow')}</p>
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
            className="scroll-mt-24 rounded-2xl border border-border bg-surface p-7 shadow-[0_30px_60px_-45px_hsl(var(--shadow-color)/0.45)] md:p-10"
          >
            <h2 className="mb-7 font-display text-2xl">{rental ? t('rentalFormTitle') : t('formTitle')}</h2>
            <LeadForm
              source={rental ? 'RENTAL' : initialPackage ? 'QUOTE' : 'CONTACT'}
              initialPackage={initialPackage}
              defaultService={pkg?.service.category}
              rental={rental}
            />
          </div>

          <aside className="contact-aside">
            <h2 className="contact-aside-title">{t('directTitle')}</h2>
            <ul className="contact-channels">
              {details.map(({ icon: Icon, label, value, href, note, external }) => {
                const inner = (
                  <>
                    <span className="contact-channel-icon">
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="contact-channel-label">{label}</span>
                      <span className="contact-channel-value">{value}</span>
                      {note && <span className="contact-channel-note">{note}</span>}
                    </span>
                    {href && <ArrowUpRight size={17} aria-hidden className="contact-channel-arrow" />}
                  </>
                )
                return (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        className="contact-channel"
                        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="contact-channel">{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="contact-hours">
              <Clock size={18} strokeWidth={1.75} aria-hidden />
              <div>
                <h2>{t('hoursTitle')}</h2>
                <p>{isThai ? company.openingHoursTh : company.openingHoursEn}</p>
              </div>
            </div>

            <p className="contact-promise">{t('responseNote')}</p>
          </aside>
        </div>
      </div>
    </section>
    </>
  )
}
