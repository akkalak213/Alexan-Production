import type { Metadata } from 'next'
import { AdminPageHeader } from '@/components/admin/AdminPage'
import { emptyProduct, ProductForm } from '@/components/admin/ProductForm'

export const metadata: Metadata = { title: 'เพิ่มผลิตภัณฑ์' }

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader title="เพิ่มผลิตภัณฑ์" description="เริ่มจากฉบับร่างได้ กรอกครบแล้วค่อยเปลี่ยนสถานะเป็นเผยแพร่" />
      <ProductForm product={emptyProduct} />
    </div>
  )
}
