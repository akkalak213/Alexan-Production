import { Info } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { EquipmentCategory } from '@/generated/prisma/enums'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import type { EquipmentCardData } from '@/components/rental/EquipmentCard'
import { RentalCatalog } from '@/components/rental/RentalCatalog'
import { Section } from '@/components/ui/Section'
import { equipmentName, formatPrice, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getEquipment, getEquipmentCountsByCategory } from '@/server/queries'
import { JsonLd } from '@/components/JsonLd'
import {
  breadcrumbSchema,
  collectionPageSchema,
  equipmentProductSchema,
} from '@/lib/structured-data'

const categories = Object.values(EquipmentCategory)

function parseCategory(value: string | undefined): EquipmentCategory | undefined {
  return categories.find((c) => c === value)
}

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
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'rental' })

  return pageMetadata({
    locale,
    path: '/rental',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function RentalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ category?: string }>
}) {
  const [{ locale }, { category }] = await Promise.all([params, searchParams])
  setRequestLocale(locale)

  const active = parseCategory(category)

  const [t, tCat, tNav, equipment, counts] = await Promise.all([
    getTranslations('rental'),
    getTranslations('equipmentCategory'),
    getTranslations('nav'),
    getEquipment(active),
    getEquipmentCountsByCategory(),
  ])

  const isThai = locale === 'th'
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  // แปลง Decimal เป็นข้อความสกุลเงินตั้งแต่ฝั่งเซิร์ฟเวอร์ — client component รับได้เฉพาะค่าที่ serialize ได้
  const items: EquipmentCardData[] = equipment.map((item) => ({
    id: item.id,
    slug: item.slug,
    category: item.category,
    brand: item.brand,
    model: item.model,
    name: isThai ? item.nameTh : item.nameEn,
    description: isThai ? item.descriptionTh : item.descriptionEn,
    specs: asSpecs(item.specs),
    dailyRateLabel: formatPrice(item.dailyRate, locale),
    weeklyRateLabel: formatPrice(item.weeklyRate, locale),
    depositLabel: formatPrice(item.depositAmount, locale),
    image: item.image,
    gallery: item.gallery,
    quantity: item.quantity,
    status: item.status,
  }))

  /**
   * รายการอุปกรณ์แบบ Product พร้อมราคาต่อวัน
   *
   * เป็นชนิดข้อมูลที่ยังได้ผลค้นหาแบบมีราคาจริง ต่างจากรีวิวของตัวเองที่ Google ไม่แสดงดาวให้
   * คนที่พิมพ์หา "เช่า <ยี่ห้อ> <รุ่น> ราคา" คือคนที่ตั้งใจจะเช่า — การมีราคาติดอยู่ในผลค้นหา
   * มีค่ากว่าการอยู่อันดับสูงแต่ไม่มีใครกดเข้ามา
   *
   * ประกาศเฉพาะตอนไม่ได้กรอง ด้วยเหตุผลเดียวกับหน้าผลงาน: canonical ของหน้าที่กรองแล้ว
   * ชี้กลับมาที่ /rental การส่งรายการคนละชุดออกไปคือการบอกว่าหน้าเดียวกันมีของไม่ตรงกัน
   */
  const productList = equipment.map((item) => ({
    /**
     * ชื่อสินค้าคือ "ยี่ห้อ + รุ่น" ตัวเดียวกับที่หน้ารายละเอียดใช้ ไม่ใช่ชื่อเรียกภาษาไทย
     * เพราะคนพิมพ์หาด้วยยี่ห้อกับรุ่น และสองหน้าต้องบอกชื่อสินค้าตรงกัน
     * ไม่งั้น Google จะเห็นเป็นสินค้าคนละตัวที่ราคาบังเอิญเท่ากัน
     */
    name: equipmentName(item.brand, item.model),
    schema: equipmentProductSchema({
      name: equipmentName(item.brand, item.model),
      description: isThai ? item.descriptionTh : item.descriptionEn,
      brand: item.brand,
      model: item.model,
      image: item.image,
      dailyRate: toNumber(item.dailyRate),
      isAvailable: item.status === 'AVAILABLE',
      locale,
      // ชี้ไปที่หน้าของชิ้นนั้นโดยตรง ไม่ใช่หน้ารวมที่กำลังเรนเดอร์อยู่
      path: `/rental/${item.slug}`,
    }),
  }))

  return (
    <>
      {!active && (
        <>
          <JsonLd
            data={{
              ...collectionPageSchema({
                name: t('title'),
                description: t('subtitle'),
                path: '/rental',
                locale,
                items: productList.map((item) => ({ name: item.name })),
              }),
              // แทนรายการชื่อเปล่า ๆ ด้วยตัวสินค้าจริงที่มีราคาและสถานะว่าง
              mainEntity: {
                '@type': 'ItemList',
                numberOfItems: productList.length,
                itemListElement: productList.map((item, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  item: item.schema,
                })),
              },
            }}
          />
          <JsonLd
            data={breadcrumbSchema([
              { name: tNav('home'), path: localizedPath(locale) },
              { name: tNav('rental'), path: localizedPath(locale, '/rental') },
            ])}
          />
        </>
      )}

    <Section eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}>
      <nav aria-label={t('filterLabel')} className="mb-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/rental"
              aria-current={!active ? 'true' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors',
                !active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-input text-muted-foreground hover:border-foreground/25 hover:text-foreground',
              )}
            >
              {tCat('all')}
              <span className="tabular text-xs opacity-60">{total}</span>
            </Link>
          </li>
          {categories.map((cat) => {
            const count = counts[cat] ?? 0
            if (count === 0) return null

            return (
              <li key={cat}>
                <Link
                  href={{ pathname: '/rental', query: { category: cat } }}
                  aria-current={active === cat ? 'true' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors',
                    active === cat
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-input text-muted-foreground hover:border-foreground/25 hover:text-foreground',
                  )}
                >
                  {tCat(cat)}
                  <span className="tabular text-xs opacity-60">{count}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <p className="mb-8 flex gap-2.5 rounded-md border border-border bg-subtle px-4 py-3 text-sm text-muted-foreground">
        <Info size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-accent" />
        <span className="text-pretty">
          {t('priceNote')} {t('studioDiscount')}
        </span>
      </p>

      <RentalCatalog items={items} />
    </Section>
    </>
  )
}
