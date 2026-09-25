import { ArrowRight, Package } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { BillingCycle, ProductType } from '@/generated/prisma/enums'
import { ContentImage } from '@/components/ui/ContentImage'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { lowestPlan, planPrice } from '@/lib/product-pricing'

export type ProductCardData = {
  id: string
  slug: string
  type: ProductType
  nameTh: string
  nameEn: string
  taglineTh: string
  taglineEn: string
  coverImage: string | null
  isAvailable: boolean
  plans: { price: unknown; billing: BillingCycle }[]
}

/**
 * การ์ดผลิตภัณฑ์ในหน้ารวม — ทั้งใบเป็นลิงก์ไปหน้ารายละเอียด
 * ราคาที่แสดงคือแพ็กเกจที่ถูกที่สุด พร้อมหน่วย ("เริ่มต้น ฿490 ต่อเดือน") ลูกค้ารู้งบขั้นต่ำตั้งแต่ยังไม่คลิก
 */
export async function ProductCard({ product, locale, priority }: { product: ProductCardData; locale: Locale; priority?: boolean }) {
  const [t, tc] = await Promise.all([getTranslations('products'), getTranslations('common')])
  const isThai = locale === 'th'
  const name = isThai ? product.nameTh : product.nameEn
  const tagline = isThai ? product.taglineTh : product.taglineEn
  const lowest = lowestPlan(product.plans)
  const price = lowest ? planPrice(lowest, locale) : null

  return (
    <article className="product-card group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-foreground/20">
      <div className="relative aspect-[16/10] overflow-hidden bg-subtle">
        {product.coverImage ? (
          <ContentImage
            src={product.coverImage}
            alt=""
            unavailableLabel={tc('imageUnavailable')}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <Package size={36} strokeWidth={1.25} aria-hidden />
          </div>
        )}
        {!product.isAvailable && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {t('unavailable')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">{t(`type.${product.type}`)}</p>
        <h3 className="mt-2 font-display text-2xl text-balance transition-colors group-hover:text-accent">{name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{tagline}</p>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-5">
          <p>
            {price?.amount ? (
              <>
                <span className="mr-1.5 text-xs text-muted-foreground">{t('startingFrom')}</span>
                <span className="tabular font-display text-2xl">{price.amount}</span>
                {price.unit && <span className="ml-1 text-xs text-muted-foreground">{price.unit}</span>}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">{t('priceOnRequest')}</span>
            )}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
            {t('viewDetails')}
            <ArrowRight size={13} strokeWidth={2} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* แผ่นกดคลุมทั้งการ์ด ไม่ซ้อนลิงก์ในลิงก์ */}
      <Link
        href={`/products/${product.slug}`}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="sr-only">{t('openDetails', { name })}</span>
      </Link>
    </article>
  )
}
