import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/AdminPage'
import { EquipmentForm } from '@/components/admin/EquipmentForm'
import { readSpecRows } from '@/lib/equipment-specs'
import { toNumber } from '@/lib/format'
import { getAdminEquipmentItem } from '@/server/admin-queries'
import { versionOf } from '@/server/cms-helpers'

export const metadata: Metadata = { title: 'แก้ไขอุปกรณ์' }

/** Decimal ของ Prisma ส่งข้าม client boundary ไม่ได้ ต้องแปลงเป็นข้อความก่อน */
const decimalToInput = (value: unknown) => {
  const n = toNumber(value)
  return n === null ? '' : String(n)
}

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getAdminEquipmentItem(id)
  if (!item) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader title={`${item.brand} ${item.model}`} />
      <EquipmentForm
        item={{
          id: item.id,
          version: versionOf(item.updatedAt),
          slug: item.slug,
          category: item.category,
          brand: item.brand,
          model: item.model,
          nameTh: item.nameTh,
          nameEn: item.nameEn,
          descriptionTh: item.descriptionTh ?? '',
          descriptionEn: item.descriptionEn ?? '',
          specs: readSpecRows(item.specs),
          dailyRate: decimalToInput(item.dailyRate),
          weeklyRate: decimalToInput(item.weeklyRate),
          depositAmount: decimalToInput(item.depositAmount),
          image: item.image ?? '',
          gallery: item.gallery,
          quantity: String(item.quantity),
          status: item.status,
          isFeatured: item.isFeatured,
          isActive: item.isActive,
          order: String(item.order),
        }}
      />
    </div>
  )
}
