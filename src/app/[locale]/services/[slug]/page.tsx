import { ArrowRight, Check } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Faq, type FaqItem } from '@/components/ui/Faq'
import { LeadForm } from '@/components/forms/LeadForm'
import { ProjectCard } from '@/components/work/ProjectCard'
import { Section } from '@/components/ui/Section'
import { ServiceIcon } from '@/components/ui/ServiceIcon'
import { JsonLd } from '@/components/JsonLd'
import { formatPrice, toNumber } from '@/lib/format'
import { breadcrumbSchema, faqSchema, serviceSchema } from '@/lib/structured-data'
import { cn } from '@/lib/utils'
import { getProjects, getServiceBySlug } from '@/server/queries'

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


type ProcessStep = { title: string; detail: string }

/** JSON จากฐานข้อมูลไม่มี type — ตรวจรูปร่างก่อนใช้ กัน error ตอนแอดมินกรอกผิดรูปแบบ */
function asProcess(value: unknown): ProcessStep[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is ProcessStep =>
      typeof item === 'object' && item !== null && 'title' in item && 'detail' in item,
  )
}

function asFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is FaqItem =>
      typeof item === 'object' && item !== null && 'question' in item && 'answer' in item,
  )
}

/**
 * ไม่ประกาศ generateStaticParams ไว้ที่นี่โดยตั้งใจ
 *
 * ตอน build บน Railway ยังต่อฐานข้อมูลไม่ได้ ฟังก์ชันนี้จึงคืนอาเรย์ว่างเสมอ
 * Next เลยประกาศ route เป็น SSG ที่ไม่มี path สักอัน แล้วเสิร์ฟ on-demand ไม่ได้
 * ผลคือหน้ารายละเอียดทุกหน้าตอบ 500 บน production ทั้งที่บนเครื่องปกติดี
 * (เครื่องเราต่อฐานข้อมูลตอน build ได้ หน้าจึงถูก prerender ไว้ล่วงหน้า จึงไม่เจอปัญหา)
 *
 * ปล่อยให้เป็น dynamic แล้วแคชด้วย revalidate ข้างบนแทน
 * ผู้เข้าคนแรกจ่ายค่าเรนเดอร์ คนถัดไปได้ของจากแคช
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) return {}

  const isThai = locale === 'th'
  const title = (isThai ? service.seoTitleTh : service.seoTitleEn) ?? (isThai ? service.titleTh : service.titleEn)
  const description =
    (isThai ? service.seoDescriptionTh : service.seoDescriptionEn) ??
    (isThai ? service.taglineTh : service.taglineEn)

  return pageMetadata({
    locale,
    path: `/services/${slug}`,
    title,
    description,
    image: service.coverImage,
    modifiedTime: service.updatedAt.toISOString(),
  })
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const service = await getServiceBySlug(slug)
  if (!service) notFound()

  const [t, tc, tNav, tCat, relatedProjects] = await Promise.all([
    getTranslations('services'),
    getTranslations('common'),
    getTranslations('nav'),
    getTranslations('serviceCategory'),
    getProjects(service.category),
  ])

  const isThai = locale === 'th'

  const title = isThai ? service.titleTh : service.titleEn
  const tagline = isThai ? service.taglineTh : service.taglineEn
  const description = isThai ? service.descriptionTh : service.descriptionEn
  const highlights = isThai ? service.highlightsTh : service.highlightsEn
  const process = asProcess(isThai ? service.processTh : service.processEn)
  const faq = asFaq(isThai ? service.faqTh : service.faqEn)

  const priceUnitLabel = {
    PROJECT: tc('perProject'),
    DAY: tc('perDay'),
    HALF_DAY: tc('perHalfDay'),
    HOUR: tc('perHour'),
    MONTH: tc('perMonth'),
    PERSON: tc('perPerson'),
    CUSTOM: '',
  } as const

  // ราคาต่ำสุดในบรรดาแพ็กเกจ ใช้บอก Google ว่าบริการนี้เริ่มต้นที่เท่าไหร่
  const lowPrice = service.packages.reduce<number | null>((lowest, pkg) => {
    const price = toNumber(pkg.priceFrom)
    if (price === null) return lowest
    return lowest === null || price < lowest ? price : lowest
  }, null)

  return (
    <>
      <JsonLd data={serviceSchema({ name: title, description, slug, locale, lowPrice })} />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('services'), path: localizedPath(locale, `/services`) },
          { name: title, path: localizedPath(locale, `/services/${slug}`) },
        ])}
      />
      <JsonLd data={faqSchema(faq)} />

      <section className="border-b border-border py-14 md:py-20">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('services'), href: '/services' },
              { label: title },
            ]}
          />

          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-16">
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-accent-subtle text-accent">
                <ServiceIcon name={service.icon} size={22} strokeWidth={1.6} />
              </span>
              <h1 className="mt-6 font-display text-display-lg text-balance">{title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
                {tagline}
              </p>
              <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
                {description}
              </p>
            </div>

            {highlights.length > 0 && (
              <div className="rounded-lg border border-border bg-subtle p-7">
                <h2 className="mb-5 text-sm font-medium">{t('highlightsTitle')}</h2>
                <ul className="space-y-3">
                  {/* ข้อความอิสระที่แอดมินพิมพ์เอง ซ้ำกันได้ จึงยึดลำดับเป็น key */}
                  {highlights.map((item, index) => (
                    <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                      <Check size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                      <span className="text-pretty">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {process.length > 0 && (
        <Section tone="subtle" eyebrow={t('processTitle')} title={t('processSubtitle')}>
          <ol className="reveal-stagger grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {process.map((step, index) => (
              <li key={index} className="bg-background p-7">
                <span className="tabular font-display text-3xl text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-medium text-balance">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {service.packages.length > 0 && (
        <Section eyebrow={t('packagesTitle')} title={t('packagesTitle')} subtitle={t('packagesSubtitle')}>
          <ul className="reveal-stagger grid gap-6 lg:grid-cols-3">
            {service.packages.map((pkg) => {
              const price = formatPrice(pkg.priceFrom, locale)
              const includes = isThai ? pkg.includesTh : pkg.includesEn

              return (
                <li
                  key={pkg.id}
                  className={cn(
                    'flex flex-col rounded-lg border bg-surface p-7',
                    pkg.isPopular ? 'border-accent shadow-lift' : 'border-border',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-2xl">{isThai ? pkg.nameTh : pkg.nameEn}</h3>
                    {pkg.isPopular && <Badge variant="accent">{t('popular')}</Badge>}
                  </div>

                  <p className="mt-4">
                    {price ? (
                      <>
                        {pkg.isStartingPrice && (
                          <span className="mr-1.5 text-sm text-muted-foreground">
                            {tc('startingFrom')}
                          </span>
                        )}
                        <span className="tabular font-display text-4xl">{price}</span>
                        {priceUnitLabel[pkg.priceUnit] && (
                          <span className="ml-1.5 text-sm text-muted-foreground">
                            {priceUnitLabel[pkg.priceUnit]}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="font-display text-2xl">{tc('customPrice')}</span>
                    )}
                  </p>

                  {includes.length > 0 && (
                    <>
                      <p className="mb-3 mt-7 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t('includes')}
                      </p>
                      <ul className="flex-1 space-y-2.5">
                        {includes.map((item, index) => (
                          <li key={index} className="flex gap-2.5 text-sm text-muted-foreground">
                            <Check size={15} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                            <span className="text-pretty">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/*
                    ลิงก์ธรรมดา ไม่ใช่ปุ่มที่ต้องรอ JavaScript
                    ส่งไปแค่ id แล้วให้หน้า /contact อ่านชื่อกับราคาจากฐานข้อมูลเอง
                    ราคาจึงเป็นค่าจริงเสมอและแก้จากแถบที่อยู่ไม่ได้

                    #lead-form พาไปหยุดตรงฟอร์มเลย ลูกค้าจะเห็นทันทีว่าแพ็กเกจที่กดมาถูกติดไปด้วยแล้ว
                    และรู้ว่าขั้นตอนต่อไปคือกรอกอะไร แทนที่จะไปโผล่บนหัวหน้าเว็บแล้วต้องเลื่อนหาเอง
                  */}
                  <Link
                    href={`/contact?package=${pkg.id}#lead-form`}
                    className={cn(
                      'mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors',
                      pkg.isPopular
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                        : 'border border-input hover:border-accent hover:bg-accent-subtle hover:text-accent',
                    )}
                  >
                    {t('packageChoose')}
                    <ArrowRight size={15} strokeWidth={2} aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {faq.length > 0 && (
        <Section tone="subtle" title={t('faqTitle')} align="center">
          <div className="mx-auto max-w-3xl">
            <Faq items={faq} />
          </div>
        </Section>
      )}

      {relatedProjects.length > 0 && (
        <Section
          eyebrow={tCat(service.category)}
          title={t('relatedWorkTitle')}
        >
          <div className="reveal-stagger grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProjects.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} locale={locale} />
            ))}
          </div>
        </Section>
      )}

      <Section
        tone="subtle"
        eyebrow={t('ctaTitle')}
        title={t('ctaTitle')}
        subtitle={t('ctaSubtitle')}
        align="center"
      >
        <div
          id="lead-form"
          className="mx-auto max-w-2xl scroll-mt-24 rounded-lg border border-border bg-surface p-7 md:p-9"
        >
          <LeadForm source="SERVICE_PAGE" defaultService={service.category} />
        </div>
      </Section>
    </>
  )
}
