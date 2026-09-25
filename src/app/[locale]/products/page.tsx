import { Info } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ProductType } from '@/generated/prisma/enums'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { JsonLd } from '@/components/JsonLd'
import { ProductCard } from '@/components/products/ProductCard'
import { Section } from '@/components/ui/Section'
import { pageMetadata } from '@/lib/seo'
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structured-data'
import { cn } from '@/lib/utils'
import { getProducts } from '@/server/queries'

const types = Object.values(ProductType)

function parseType(value: string | undefined): ProductType | undefined {
  return types.find((type) => type === value)
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'products' })

  return pageMetadata({
    locale,
    path: '/products',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

/**
 * หน้ารวมผลิตภัณฑ์ที่ขาย
 *
 * ตัวกรองเป็นลิงก์จริง (?type=) เหมือนหน้าผลงานและหน้าเช่า แต่ละประเภทมี URL ของตัวเอง แชร์ได้ กด back ได้
 * ดึงรายการทั้งหมดครั้งเดียวแล้วกรองที่นี่ จำนวนต่อประเภทบนชิปจึงนับจากชุดเดียวกับที่แสดง
 */
export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ type?: string }>
}) {
  const [{ locale }, { type }] = await Promise.all([params, searchParams])
  setRequestLocale(locale)

  const active = parseType(type)
  const [t, tNav, products] = await Promise.all([
    getTranslations('products'),
    getTranslations('nav'),
    getProducts(),
  ])

  const isThai = locale === 'th'
  const counts: Partial<Record<ProductType, number>> = {}
  for (const product of products) counts[product.type] = (counts[product.type] ?? 0) + 1
  const visible = active ? products.filter((product) => product.type === active) : products

  const chip = (isActive: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors',
      isActive
        ? 'border-foreground bg-foreground text-background'
        : 'border-input text-muted-foreground hover:border-foreground/25 hover:text-foreground',
    )

  return (
    <>
      {/* ประกาศเฉพาะหน้าที่ไม่ได้กรอง canonical ของหน้าที่กรองแล้วชี้กลับมาที่ /products */}
      {!active && (
        <>
          <JsonLd
            data={collectionPageSchema({
              name: t('title'),
              description: t('subtitle'),
              path: '/products',
              locale,
              items: products.map((product) => ({ name: isThai ? product.nameTh : product.nameEn })),
            })}
          />
          <JsonLd
            data={breadcrumbSchema([
              { name: tNav('home'), path: localizedPath(locale) },
              { name: tNav('products'), path: localizedPath(locale, '/products') },
            ])}
          />
        </>
      )}

      <Section headingLevel="h1" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}>
        {types.filter((value) => counts[value]).length > 1 && (
          <nav aria-label={t('filterLabel')} className="mb-8">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link href="/products" aria-current={!active ? 'true' : undefined} className={chip(!active)}>
                  {t('all')}
                  <span className="tabular text-xs opacity-60">{products.length}</span>
                </Link>
              </li>
              {types.map((value) =>
                counts[value] ? (
                  <li key={value}>
                    <Link
                      href={{ pathname: '/products', query: { type: value } }}
                      aria-current={active === value ? 'true' : undefined}
                      className={chip(active === value)}
                    >
                      {t(`type.${value}`)}
                      <span className="tabular text-xs opacity-60">{counts[value]}</span>
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </nav>
        )}

        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <>
            <p className="mb-8 flex gap-2.5 rounded-md border border-border bg-subtle px-4 py-3 text-sm text-muted-foreground">
              <Info size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-accent" />
              <span className="text-pretty">{t('priceNote')}</span>
            </p>
            <ul className="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((product, index) => (
                <li key={product.id}>
                  <ProductCard product={product} locale={locale} priority={index < 3} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </>
  )
}
