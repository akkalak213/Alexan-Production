import { CalendarClock, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { JsonLd } from '@/components/JsonLd'
import { LeadForm } from '@/components/forms/LeadForm'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { buttonClasses } from '@/components/ui/Button'
import { equipmentBrand, equipmentName, formatPrice, toNumber } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { breadcrumbSchema, equipmentProductSchema } from '@/lib/structured-data'
import { cn } from '@/lib/utils'
import { getEquipmentBySlug, getRelatedEquipment } from '@/server/queries'

/**
 * หน้ารายละเอียดอุปกรณ์รายชิ้น
 *
 * เหตุผลที่ต้องเป็น "หน้า" ไม่ใช่กล่องซ้อนอย่างเดียว: คนที่พิมพ์หา "เช่า Lumix S5 mark 2"
 * ต้องเจอหน้าที่พูดถึงรุ่นนั้นโดยตรง กล่องซ้อนไม่มี URL ของตัวเอง จึงไม่มีอะไรให้ Google จัดอันดับ
 * และแชร์ลิงก์ให้ลูกค้าดูของชิ้นเดียวไม่ได้
 *
 * เรนเดอร์ตอนมีคนขอ ไม่ prerender ตอน build ด้วยเหตุผลเดียวกับหน้าอื่น —
 * ตอน build บน Railway ยังต่อฐานข้อมูลไม่ได้
 */
export const dynamic = 'force-dynamic'

type Spec = { label: string; value: string }

function asSpecs(value: unknown): Spec[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Spec =>
      typeof item === 'object' && item !== null && 'label' in item && 'value' in item,
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const item = await getEquipmentBySlug(slug)
  if (!item) return {}

  const t = await getTranslations({ locale, namespace: 'rental' })
  const isThai = locale === 'th'

  /**
   * ชื่อในหัวเรื่องคือ "ยี่ห้อ + รุ่น" ไม่ใช่ชื่อเรียกภายใน
   * เพราะคนพิมพ์หาด้วยยี่ห้อกับรุ่น ไม่มีใครพิมพ์หาว่า "กล้องไฮบริด"
   */
  const name = equipmentName(item.brand, item.model)

  return pageMetadata({
    locale,
    path: `/rental/${slug}`,
    title: t('detailMetaTitle', { name }),
    description:
      (isThai ? item.descriptionTh : item.descriptionEn) ||
      t('detailMetaDescription', { name }),
    image: item.image || null,
    modifiedTime: item.updatedAt.toISOString(),
  })
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const item = await getEquipmentBySlug(slug)
  if (!item) notFound()

  const [t, tNav, tCat, related] = await Promise.all([
    getTranslations('rental'),
    getTranslations('nav'),
    getTranslations('equipmentCategory'),
    getRelatedEquipment(item.category, item.id),
  ])

  const isThai = locale === 'th'
  const name = equipmentName(item.brand, item.model)
  const brand = equipmentBrand(item.brand)
  const localName = isThai ? item.nameTh : item.nameEn
  const description = isThai ? item.descriptionTh : item.descriptionEn
  const specs = asSpecs(item.specs)
  const isAvailable = item.status === 'AVAILABLE'

  const images = [item.image, ...item.gallery].filter((url): url is string => Boolean(url))

  const rates = [
    item.dailyRate && { label: t('perDay'), value: formatPrice(item.dailyRate, locale), lead: true },
    item.weeklyRate && {
      label: t('perWeek'),
      value: formatPrice(item.weeklyRate, locale),
      lead: false,
    },
    item.depositAmount && {
      label: t('deposit'),
      value: formatPrice(item.depositAmount, locale),
      lead: false,
    },
  ].filter(Boolean) as { label: string; value: string | null; lead: boolean }[]

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          ...equipmentProductSchema({
            name,
            description: description || localName,
            brand: item.brand,
            model: item.model,
            image: item.image,
            dailyRate: toNumber(item.dailyRate),
            isAvailable,
            locale,
            // หน้านี้มี URL ของตัวเองแล้ว ต่างจากตอนอยู่ในรายการรวมที่ชี้กลับไปที่ /rental
            path: `/rental/${slug}`,
          }),
          ...(specs.length
            ? {
                additionalProperty: specs.map((spec) => ({
                  '@type': 'PropertyValue',
                  name: spec.label,
                  value: spec.value,
                })),
              }
            : {}),
        }}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('rental'), path: localizedPath(locale, '/rental') },
          { name, path: localizedPath(locale, `/rental/${slug}`) },
        ])}
      />

      <section className="border-b border-border py-14 md:py-20">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('rental'), href: '/rental' },
              { label: name },
            ]}
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-subtle">
                {images[0] && (
                  <Image
                    src={images[0]}
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="object-cover"
                  />
                )}
                <span
                  className={cn(
                    'absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-medium',
                    isAvailable
                      ? 'bg-success/15 text-success'
                      : 'bg-background/90 text-muted-foreground',
                  )}
                >
                  {t(`status.${item.status}`)}
                </span>
              </div>

              {/*
                รูปเพิ่มเติมเป็นภาพนิ่งเรียงกัน ไม่ใช่แกลเลอรีที่ต้องกดสลับ
                หน้านี้เป็นหน้าที่คนมาจากผลค้นหา ควรเห็นของครบตั้งแต่เลื่อนผ่าน
                ไม่ต้องรู้ว่าต้องกดตรงไหนถึงจะเห็นรูปที่เหลือ
              */}
              {images.length > 1 && (
                <>
                  <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('gallery')}
                  </h2>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.slice(1).map((url, index) => (
                      <li
                        key={`${url}-${index}`}
                        className="relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-subtle"
                      >
                        <Image
                          src={url}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 18rem, 45vw"
                          className="object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div>
              {brand && (
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{brand}</p>
              )}
              <h1 className="mt-2 font-display text-4xl text-balance md:text-5xl">{item.model}</h1>
              <p className="mt-3 text-lg text-muted-foreground text-pretty">{localName}</p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge>{tCat(item.category)}</Badge>
                {item.quantity > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {t('quantity', { count: item.quantity })}
                  </span>
                )}
              </div>

              {rates.length > 0 && (
                <dl className="mt-8 divide-y divide-border rounded-lg border border-border">
                  {rates.map((rate) => (
                    <div key={rate.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
                      <dt className="text-sm text-muted-foreground">{rate.label}</dt>
                      <dd
                        className={cn(
                          'tabular text-right font-medium',
                          rate.lead ? 'font-display text-2xl' : 'text-sm',
                        )}
                      >
                        {rate.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('priceNote')}</p>

              {!isAvailable && (
                <p className="mt-4 flex items-start gap-2 rounded-md border border-border bg-subtle px-3.5 py-3 text-sm text-muted-foreground">
                  <CalendarClock size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
                  {t('unavailableNote')}
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#request" className={buttonClasses('primary', 'md')}>
                  {t('requestThis')}
                </a>
                {/* ส่งไปแค่ id แล้วให้หน้าปลายทางอ่านเรตจากฐานข้อมูลเอง ราคาจึงเป็นค่าจริงเสมอ */}
                <Link
                  href={{ pathname: '/rental/estimate', query: { items: item.id, days: 1 } }}
                  className={buttonClasses('outline', 'md')}
                >
                  <FileText size={15} strokeWidth={1.75} aria-hidden />
                  {t('estimateThis')}
                </Link>
              </div>

              <p className="mt-6 text-sm text-muted-foreground text-pretty">
                {description || t('noDescription')}
              </p>

              {specs.length > 0 && (
                <>
                  <h2 className="mb-2.5 mt-8 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('specs')}
                  </h2>
                  <dl className="divide-y divide-border rounded-md border border-border">
                    {/* หัวข้อสเปกมาจากที่แอดมินพิมพ์เอง ซ้ำกันได้ จึงยึดลำดับเป็น key */}
                    {specs.map((spec, index) => (
                      <div key={index} className="flex justify-between gap-4 px-3.5 py-2.5 text-sm">
                        <dt className="text-muted-foreground">{spec.label}</dt>
                        <dd className="text-right font-medium text-pretty">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── ฟอร์มขอใบเสนอราคา ติ๊กชิ้นนี้ไว้ให้แล้ว ───────────── */}
      <section id="request" className="scroll-mt-24 border-b border-border py-14 md:py-20">
        <div className="container max-w-2xl">
          <h2 className="font-display text-3xl text-balance">
            {t('requestFormTitle', { name })}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground text-pretty">{t('requestFormNote')}</p>

          <div className="mt-8">
            <LeadForm
              source="RENTAL"
              showServicePicker={false}
              equipmentIds={[item.id]}
              equipmentLabels={[name]}
            />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-14 md:py-20">
          <div className="container">
            <h2 className="font-display text-3xl text-balance">{t('relatedTitle')}</h2>

            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other) => (
                <li key={other.id}>
                  <Link
                    href={`/rental/${other.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-foreground/20"
                  >
                    <div className="relative aspect-[4/3] bg-subtle">
                      {other.image && (
                        <Image
                          src={other.image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      {equipmentBrand(other.brand) && (
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {equipmentBrand(other.brand)}
                        </p>
                      )}
                      <h3 className="mt-1 font-display text-lg text-balance transition-colors group-hover:text-accent">
                        {other.model}
                      </h3>
                      {other.dailyRate && (
                        <p className="tabular mt-auto pt-4 text-sm">
                          {formatPrice(other.dailyRate, locale)}
                          <span className="ml-1 text-xs text-muted-foreground">{t('perDay')}</span>
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/rental"
              className="mt-10 inline-flex text-sm text-accent underline underline-offset-4 hover:no-underline"
            >
              {t('backToCatalog')}
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
