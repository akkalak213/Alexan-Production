import { Package } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { AdminPageHeader, EmptyState, StatusPill } from '@/components/admin/AdminPage'
import { contentStatusLabels, productTypeLabels } from '@/lib/admin-labels'
import { lowestPlan, planPriceTag } from '@/lib/product-pricing'
import { getAdminProducts } from '@/server/admin-queries'

export const metadata: Metadata = { title: 'ผลิตภัณฑ์' }

export default async function AdminProductsPage() {
  const products = await getAdminProducts()

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="ผลิตภัณฑ์"
        description="โปรแกรม ระบบ เทมเพลต และสินค้าบนหน้า /products — ขึ้นหน้าเว็บเฉพาะสถานะ “เผยแพร่แล้ว”"
        action={{ href: '/admin/products/new', label: 'เพิ่มผลิตภัณฑ์' }}
      />

      {products.length === 0 ? (
        <EmptyState>ยังไม่มีผลิตภัณฑ์ในระบบ กด “เพิ่มผลิตภัณฑ์” เพื่อเริ่ม</EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {products.map((product) => {
            const lowest = lowestPlan(product.plans)
            return (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="relative grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-subtle text-muted-foreground">
                    {product.coverImage ? (
                      <Image src={product.coverImage} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <Package size={18} strokeWidth={1.5} aria-hidden />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.nameTh}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {productTypeLabels[product.type]} · {product.plans.length} แพ็กเกจ
                      {product._count.leads > 0 && ` · ${product._count.leads} คำขอ`}
                      {!product.isAvailable && ' · ปิดรับชั่วคราว'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular hidden text-sm sm:inline">
                      {lowest ? `เริ่ม ${planPriceTag(lowest, 'th')}` : 'สอบถามราคา'}
                    </span>
                    <StatusPill tone={product.status === 'PUBLISHED' ? 'success' : 'muted'}>
                      {contentStatusLabels[product.status]}
                    </StatusPill>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
