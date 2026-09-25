import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/AdminPage'
import { ProductForm } from '@/components/admin/ProductForm'
import { readSpecRows } from '@/lib/equipment-specs'
import { toNumber } from '@/lib/format'
import { getAdminProduct } from '@/server/admin-queries'
import { toPairRows, versionOf } from '@/server/cms-helpers'

export const metadata: Metadata = { title: 'แก้ไขผลิตภัณฑ์' }

/** Decimal ของ Prisma ส่งข้าม client boundary ไม่ได้ ต้องแปลงเป็นข้อความก่อน */
const decimalToInput = (value: unknown) => {
  const n = toNumber(value)
  return n === null ? '' : String(n)
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getAdminProduct(id)
  if (!product) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title={product.nameTh}
        description={product.status === 'PUBLISHED' ? `อยู่บนหน้าเว็บที่ /products/${product.slug}` : 'ยังไม่ขึ้นหน้าเว็บ'}
      />
      <ProductForm
        product={{
          id: product.id,
          version: versionOf(product.updatedAt),
          slug: product.slug,
          type: product.type,
          nameTh: product.nameTh,
          nameEn: product.nameEn,
          taglineTh: product.taglineTh,
          taglineEn: product.taglineEn,
          descriptionTh: product.descriptionTh,
          descriptionEn: product.descriptionEn,
          featuresTh: toPairRows(product.featuresTh, 'title', 'detail'),
          featuresEn: toPairRows(product.featuresEn, 'title', 'detail'),
          faqTh: toPairRows(product.faqTh, 'question', 'answer'),
          faqEn: toPairRows(product.faqEn, 'question', 'answer'),
          specs: readSpecRows(product.specs),
          coverImage: product.coverImage ?? '',
          gallery: product.gallery,
          videoUrl: product.videoUrl ?? '',
          demoUrl: product.demoUrl ?? '',
          buyUrl: product.buyUrl ?? '',
          status: product.status,
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
          order: String(product.order),
          plans: product.plans.map((plan) => ({
            id: plan.id,
            nameTh: plan.nameTh,
            nameEn: plan.nameEn,
            price: decimalToInput(plan.price),
            billing: plan.billing,
            includesTh: plan.includesTh.join('\n'),
            includesEn: plan.includesEn.join('\n'),
            buyUrl: plan.buyUrl ?? '',
            isPopular: plan.isPopular,
          })),
        }}
      />
    </div>
  )
}
