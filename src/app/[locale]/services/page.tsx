import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { buttonClasses } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { ServiceCard } from '@/components/services/ServiceCard'
import { getActiveServices } from '@/server/queries'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structured-data'

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
  const t = await getTranslations({ locale, namespace: 'services' })

  return pageMetadata({
    locale,
    path: '/services',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, tc, tNav, services] = await Promise.all([
    getTranslations('services'),
    getTranslations('common'),
    getTranslations('nav'),
    getActiveServices(),
  ])

  const isThai = locale === 'th'

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: t('title'),
          description: t('subtitle'),
          path: '/services',
          locale,
          items: services.map((service) => ({
            name: isThai ? service.titleTh : service.titleEn,
            path: `/services/${service.slug}`,
          })),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('services'), path: localizedPath(locale, '/services') },
        ])}
      />
      <Section eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}>
        {services.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {tc('empty')}
          </p>
        ) : (
          <ul className="service-grid reveal-stagger">
            {services.map((service, index) => (
              <li key={service.id}>
                <ServiceCard service={service} locale={locale} index={index} actionLabel={tc('viewDetails')} headingAs="h2" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <section className="border-t border-border bg-subtle py-20 md:py-24">
        <div className="container text-center">
          <h2 className="font-display text-display-sm text-balance">{t('ctaTitle')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-pretty">
            {t('ctaSubtitle')}
          </p>
          <Link href="/contact" className={buttonClasses('accent', 'lg', 'mt-8')}>
            {tc('getQuote')}
            <ArrowRight size={18} strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </>
  )
}
