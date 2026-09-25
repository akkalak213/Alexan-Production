import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ServiceCategory } from '@/generated/prisma/enums'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { isPlaceholderImage } from '@/lib/sample-content'
import { startingPrice } from '@/lib/service-pricing'
import { ContactBand } from '@/components/ui/ContactBand'
import { Section } from '@/components/ui/Section'
import { ServiceIndex, type ServiceIndexGroup } from '@/components/services/ServiceIndex'
import { getCategoryShowcase, getHomeServices } from '@/server/queries'
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

const DIGITAL: readonly ServiceCategory[] = ['WEB', 'WEB_APP', 'MOBILE_APP']

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

  const [t, tc, tNav, tHome, tContact, services, showcase] = await Promise.all([
    getTranslations('services'),
    getTranslations('common'),
    getTranslations('nav'),
    getTranslations('home'),
    getTranslations('contact'),
    getHomeServices(),
    getCategoryShowcase(),
  ])

  const isThai = locale === 'th'

  type Service = (typeof services)[number]
  const toItem = (service: Service) => {
    // ภาพปกของบริการเองมาก่อน ถ้าไม่มีใช้ภาพปกผลงานล่าสุดในหมวดเดียวกัน
    const image = [service.coverImage, showcase[service.category]?.cover].find(
      (url): url is string => typeof url === 'string' && url !== '' && !isPlaceholderImage(url),
    )
    return {
      id: service.id,
      href: `/services/${service.slug}`,
      title: isThai ? service.titleTh : service.titleEn,
      tagline: isThai ? service.taglineTh : service.taglineEn,
      highlights: isThai ? service.highlightsTh : service.highlightsEn,
      price: startingPrice(service.packages[0], locale, tc),
      image,
    }
  }
  const groupOf = (id: 'digital' | 'visual', members: Service[]): ServiceIndexGroup => ({
    id,
    label: tHome(`groups.${id}`),
    countLabel: t('groupCount', { count: members.length }),
    items: members.map(toItem),
  })
  // สตูดิโอเป็นส่วนหนึ่งของงานภาพ อยู่กลุ่มเดียวกับถ่ายภาพและวิดีโอ
  const groups = [
    groupOf('digital', services.filter((service) => DIGITAL.includes(service.category))),
    groupOf('visual', services.filter((service) => !DIGITAL.includes(service.category))),
  ]

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
      <Section
        headingLevel="h1"
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
        action={<p className="page-hero-note">{tHome('servicesPriceNote')}</p>}
        className="pb-10 md:pb-14"
      >
        {services.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {tc('empty')}
          </p>
        ) : (
          <ServiceIndex groups={groups} unavailableLabel={tc('imageUnavailable')} />
        )}
      </Section>

      <ContactBand
        eyebrow={tHome('ctaNote')}
        title={tHome('ctaTitle')}
        subtitle={tHome('ctaSubtitle')}
        actionLabel={tc('getQuote')}
        note={tContact('responseNote')}
      />
    </>
  )
}
