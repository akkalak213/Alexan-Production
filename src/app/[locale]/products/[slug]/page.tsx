import { ArrowRight, ArrowUpRight, CalendarClock, Check, Package, Play } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { JsonLd } from '@/components/JsonLd'
import { LeadForm } from '@/components/forms/LeadForm'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { buttonClasses } from '@/components/ui/Button'
import { ContentImage } from '@/components/ui/ContentImage'
import { Faq, type FaqItem } from '@/components/ui/Faq'
import { Prose } from '@/components/ui/Prose'
import { Section } from '@/components/ui/Section'
import { MediaGallery, type GalleryItem } from '@/components/work/MediaGallery'
import { VideoEmbed } from '@/components/work/VideoEmbed'
import { localizeSpecs } from '@/lib/equipment-specs'
import { safeExternalUrl } from '@/lib/external-link'
import { parseVideoUrl, videoThumbnailUrl } from '@/lib/format'
import { lowestPlan, planAmount, planPrice, planPriceTag } from '@/lib/product-pricing'
import { pageMetadata } from '@/lib/seo'
import { breadcrumbSchema, faqSchema, productSchema } from '@/lib/structured-data'
import { cn } from '@/lib/utils'
import { getProductBySlug } from '@/server/queries'

/**
 * หน้ารายละเอียดผลิตภัณฑ์
 *
 * ลำดับตามที่คนตัดสินใจซื้ออ่านจริง: เห็นของกับราคาเริ่มต้นก่อน → ดูวิดีโอ/ภาพ → อ่านรายละเอียด
 * → เทียบแพ็กเกจ → เช็กสเปก → คำถามที่ค้างใจ → ส่งคำขอ
 *
 * ซื้อได้สองทางตามที่แอดมินตั้ง: ลิงก์ร้านค้าภายนอก (ของแพ็กเกจหรือของผลิตภัณฑ์) หรือส่งคำขอให้ทีมติดต่อกลับ
 * ปุ่มเลือกแพ็กเกจเป็นลิงก์ธรรมดา (?plan=…#request) ฟอร์มติดแพ็กเกจนั้นมาจากฝั่งเซิร์ฟเวอร์ ไม่ต้องรอ JavaScript
 *
 * เรนเดอร์ตอนมีคนขอ ไม่ prerender ตอน build ด้วยเหตุผลเดียวกับหน้ารายละเอียดอื่น (ตอน build ยังต่อฐานข้อมูลไม่ได้)
 */
export const dynamic = 'force-dynamic'

type Feature = { title: string; detail: string }

/** JSON จากฐานข้อมูลไม่มี type — ตรวจรูปร่างก่อนใช้ กันหน้าพังเมื่อข้อมูลผิดรูปแบบ */
function asFeatures(value: unknown): Feature[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Feature => typeof item === 'object' && item !== null && 'title' in item && 'detail' in item,
  )
}

function asFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is FaqItem =>
      typeof item === 'object' && item !== null && 'question' in item && 'answer' in item,
  )
}

type Params = {
  params: Promise<{ locale: Locale; slug: string }>
  searchParams: Promise<{ plan?: string }>
}

export async function generateMetadata({ params }: Pick<Params, 'params'>): Promise<Metadata> {
  const { locale, slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}

  const t = await getTranslations({ locale, namespace: 'products' })
  const isThai = locale === 'th'
  const name = isThai ? product.nameTh : product.nameEn

  return pageMetadata({
    locale,
    path: `/products/${slug}`,
    title: t('detailMetaTitle', { name }),
    description: isThai ? product.taglineTh : product.taglineEn,
    image: product.coverImage,
    modifiedTime: product.updatedAt.toISOString(),
  })
}

export default async function ProductDetailPage({ params, searchParams }: Params) {
  const [{ locale, slug }, { plan: planId }] = await Promise.all([params, searchParams])
  setRequestLocale(locale)

  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [t, tNav, tc] = await Promise.all([
    getTranslations('products'),
    getTranslations('nav'),
    getTranslations('common'),
  ])

  const isThai = locale === 'th'
  const name = isThai ? product.nameTh : product.nameEn
  const tagline = isThai ? product.taglineTh : product.taglineEn
  const description = isThai ? product.descriptionTh : product.descriptionEn
  const features = asFeatures(isThai ? product.featuresTh : product.featuresEn)
  const faq = asFaq(isThai ? product.faqTh : product.faqEn)
  const specs = localizeSpecs(product.specs, locale)
  const video = parseVideoUrl(product.videoUrl)
  const demoUrl = safeExternalUrl(product.demoUrl)
  const storeUrl = safeExternalUrl(product.buyUrl)

  const plans = product.plans.map((plan) => ({
    ...plan,
    name: isThai ? plan.nameTh : plan.nameEn,
    includes: isThai ? plan.includesTh : plan.includesEn,
    price: planPrice(plan, locale),
    // ลิงก์ของแพ็กเกจมาก่อน ไม่มีค่อยใช้ร้านค้าของผลิตภัณฑ์
    buyUrl: safeExternalUrl(plan.buyUrl) ?? storeUrl,
  }))
  const lowest = lowestPlan(product.plans)
  const lowestPrice = lowest ? planPrice(lowest, locale) : null
  const chosen = product.plans.find((plan) => plan.id === planId) ?? null

  const gallery: GalleryItem[] = product.gallery.map((url, index) => ({
    id: `${index}-${url}`,
    url,
    width: null,
    height: null,
    blurData: null,
    caption: null,
    alt: `${name} ${index + 1}`,
  }))

  const planHref = (id: string) => ({
    pathname: `/products/${slug}`,
    query: { plan: id },
    hash: 'request',
  })

  return (
    <>
      <JsonLd
        data={productSchema({
          name,
          description: tagline,
          type: product.type,
          image: product.coverImage,
          plans: product.plans.map((plan) => ({
            name: isThai ? plan.nameTh : plan.nameEn,
            amount: planAmount(plan),
            billing: plan.billing,
          })),
          isAvailable: product.isAvailable,
          locale,
          slug,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('products'), path: localizedPath(locale, '/products') },
          { name, path: localizedPath(locale, `/products/${slug}`) },
        ])}
      />
      <JsonLd data={faqSchema(faq)} />

      {/* ─────────────── เปิดหน้า: ภาพ ชื่อ ราคาเริ่มต้น ปุ่มซื้อ ─────────────── */}
      <section className="border-b border-border py-14 md:py-20">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('products'), href: '/products' },
              { label: name },
            ]}
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-subtle shadow-lift">
              {product.coverImage ? (
                <ContentImage
                  src={product.coverImage}
                  alt=""
                  unavailableLabel={tc('imageUnavailable')}
                  fill
                  priority
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                  <Package size={48} strokeWidth={1.1} aria-hidden />
                </div>
              )}
            </div>

            <div>
              <Badge variant="accent">{t(`type.${product.type}`)}</Badge>
              <h1 className="mt-4 font-display text-display-lg text-balance">{name}</h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">{tagline}</p>

              <p className="mt-7">
                {lowestPrice?.amount ? (
                  <>
                    <span className="mr-2 text-sm text-muted-foreground">{t('startingFrom')}</span>
                    <span className="tabular font-display text-4xl">{lowestPrice.amount}</span>
                    {lowestPrice.unit && <span className="ml-1.5 text-sm text-muted-foreground">{lowestPrice.unit}</span>}
                  </>
                ) : (
                  <span className="font-display text-2xl">{t('priceOnRequest')}</span>
                )}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('priceNote')}</p>

              {!product.isAvailable && (
                <p className="mt-5 flex items-start gap-2 rounded-md border border-border bg-subtle px-3.5 py-3 text-sm text-muted-foreground">
                  <CalendarClock size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
                  {t('unavailableNote')}
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#request" className={buttonClasses('accent', 'lg')}>
                  {t('interested')}
                  <ArrowRight size={17} aria-hidden />
                </a>
                {demoUrl && (
                  <a href={demoUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('outline', 'lg')}>
                    <Play size={16} aria-hidden />
                    {t('tryDemo')}
                  </a>
                )}
                {storeUrl && product.isAvailable && (
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses('outline', 'lg')}
                    title={t('externalNote')}
                  >
                    {t('buyStore')}
                    <ArrowUpRight size={16} aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {video && (
        <div className="container pt-14 md:pt-20">
          <VideoEmbed
            source={video}
            poster={product.coverImage || videoThumbnailUrl(video)}
            title={name}
            playLabel={t('watchVideo')}
          />
        </div>
      )}

      {/* ─────────────── รายละเอียดกับจุดเด่น ─────────────── */}
      {(description || features.length > 0) && (
        <Section title={t('overview')}>
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
            {description && <Prose>{description}</Prose>}
            {features.length > 0 && (
              <div>
                <h3 className="mb-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('features')}</h3>
                {/* ข้อความอิสระที่แอดมินพิมพ์เอง ซ้ำกันได้ จึงยึดลำดับเป็น key */}
                <ul className="reveal-stagger space-y-5">
                  {features.map((feature, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent">
                        <Check size={14} strokeWidth={2.25} aria-hidden />
                      </span>
                      <div>
                        <p className="font-medium text-balance">{feature.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{feature.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {gallery.length > 0 && (
        <Section tone="subtle" title={t('gallery')}>
          <MediaGallery items={gallery} layout="grid" />
        </Section>
      )}

      {/* ─────────────── แพ็กเกจ ─────────────── */}
      {plans.length > 0 && (
        <Section title={t('plansTitle')} subtitle={t('plansSubtitle')}>
          <ul className={cn('reveal-stagger grid gap-6', plans.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
            {plans.map((plan) => (
              <li
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-lg border bg-surface p-7',
                  plan.isPopular ? 'border-accent shadow-lift' : 'border-border',
                  chosen?.id === plan.id && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-2xl">{plan.name}</h3>
                  {plan.isPopular && <Badge variant="accent">{t('popular')}</Badge>}
                </div>

                {/* สูงเท่ากันทุกใบ และแพ็กเกจที่ไม่มีราคาไม่ใช้ตัวใหญ่เท่าชื่อแพ็กเกจ จะได้ไม่อ่านเป็นหัวข้อซ้ำสองบรรทัด */}
                <p className="mt-4 flex min-h-12 flex-wrap items-baseline">
                  {plan.price.amount ? (
                    <>
                      <span className="tabular font-display text-4xl">{plan.price.amount}</span>
                      {plan.price.unit && <span className="ml-1.5 text-sm text-muted-foreground">{plan.price.unit}</span>}
                    </>
                  ) : (
                    <span className="text-lg font-medium text-muted-foreground">{plan.price.unit}</span>
                  )}
                </p>

                {plan.includes.length > 0 && (
                  <>
                    <p className="mb-3 mt-7 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('includes')}
                    </p>
                    <ul className="flex-1 space-y-2.5">
                      {plan.includes.map((item, index) => (
                        <li key={index} className="flex gap-2.5 text-sm text-muted-foreground">
                          <Check size={15} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                          <span className="text-pretty">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="mt-7 space-y-2">
                  {plan.buyUrl && product.isAvailable ? (
                    <>
                      <a
                        href={plan.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('externalNote')}
                        className={cn(buttonClasses(plan.isPopular ? 'accent' : 'primary', 'md'), 'w-full')}
                      >
                        {t('buyNow')}
                        <ArrowUpRight size={15} aria-hidden />
                      </a>
                      <Link href={planHref(plan.id)} className={cn(buttonClasses('ghost', 'md'), 'w-full')}>
                        {t('askAboutPlan')}
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={planHref(plan.id)}
                      className={cn(buttonClasses(plan.isPopular ? 'accent' : 'outline', 'md'), 'w-full')}
                    >
                      {t('choosePlan')}
                      <ArrowRight size={15} aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {specs.length > 0 && (
        <Section tone="subtle" title={t('specs')}>
          <dl className="mx-auto max-w-3xl divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {/* หัวข้อสเปกมาจากที่แอดมินพิมพ์เอง ซ้ำกันได้ จึงยึดลำดับเป็น key */}
            {specs.map((spec, index) => (
              <div key={index} className="grid gap-1 px-5 py-3.5 text-sm sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="text-muted-foreground">{spec.label}</dt>
                <dd className="font-medium text-pretty">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {faq.length > 0 && (
        <Section title={t('faqTitle')} align="center">
          <div className="mx-auto max-w-3xl">
            <Faq items={faq} />
          </div>
        </Section>
      )}

      {/* ─────────────── ส่งคำขอ ─────────────── */}
      <section id="request" className="scroll-mt-24 border-t border-border bg-subtle py-14 md:py-20">
        <div className="container max-w-2xl">
          <h2 className="font-display text-3xl text-balance">{t('requestTitle', { name })}</h2>
          <p className="mt-3 text-sm text-muted-foreground text-pretty">{t('requestNote')}</p>
          <div className="mt-8 rounded-lg border border-border bg-surface p-7 md:p-9">
            <LeadForm
              source="PRODUCT"
              showServicePicker={false}
              product={{
                id: product.id,
                name,
                planId: chosen?.id ?? null,
                planName: chosen ? (isThai ? chosen.nameTh : chosen.nameEn) : null,
                priceTag: chosen ? planPriceTag(chosen, locale) : null,
              }}
            />
          </div>
          <Link href="/products" className="mt-8 inline-flex text-sm text-accent underline underline-offset-4 hover:no-underline">
            {t('backToList')}
          </Link>
        </div>
      </section>
    </>
  )
}
