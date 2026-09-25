'use client'

import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { BillingCycle, ContentStatus, ProductType } from '@/generated/prisma/enums'
import { AdminCard } from '@/components/admin/AdminPage'
import { AdminForm } from '@/components/admin/AdminForm'
import {
  BilingualTabs,
  ConfirmSubmitButton,
  PairInput,
  SpecInput,
  SubmitButton,
  VersionField,
} from '@/components/admin/AdminUI'
import { ImageField, ImageListField } from '@/components/admin/ImageField'
import { buttonClasses } from '@/components/ui/Button'
import { Field, FormMessage, Input, Select, Textarea } from '@/components/ui/Form'
import { useActionToast } from '@/components/ui/Toast'
import { billingCycleLabels, contentStatusLabels, productTypeLabels } from '@/lib/admin-labels'
import type { SpecRow } from '@/lib/equipment-specs'
import { initialAdminState } from '@/server/admin-state'
import { deleteProduct, saveProduct } from '@/server/cms-actions'

type PairRow = { key: string; value: string }

export type ProductPlanRow = {
  id: string
  nameTh: string
  nameEn: string
  price: string
  billing: BillingCycle
  includesTh: string
  includesEn: string
  buyUrl: string
  isPopular: boolean
}

export type ProductFormData = {
  id: string
  /** เวลาแก้ล่าสุดของระเบียนที่หน้านี้เรนเดอร์มา — กันการบันทึกทับข้อมูลที่ใหม่กว่า */
  version: string
  slug: string
  type: ProductType
  nameTh: string
  nameEn: string
  taglineTh: string
  taglineEn: string
  descriptionTh: string
  descriptionEn: string
  featuresTh: PairRow[]
  featuresEn: PairRow[]
  faqTh: PairRow[]
  faqEn: PairRow[]
  specs: SpecRow[]
  coverImage: string
  gallery: string[]
  videoUrl: string
  demoUrl: string
  buyUrl: string
  status: ContentStatus
  isAvailable: boolean
  isFeatured: boolean
  order: string
  plans: ProductPlanRow[]
}

export const emptyProduct: ProductFormData = {
  id: '',
  version: '',
  slug: '',
  type: 'SOFTWARE',
  nameTh: '',
  nameEn: '',
  taglineTh: '',
  taglineEn: '',
  descriptionTh: '',
  descriptionEn: '',
  featuresTh: [],
  featuresEn: [],
  faqTh: [],
  faqEn: [],
  specs: [],
  coverImage: '',
  gallery: [],
  videoUrl: '',
  demoUrl: '',
  buyUrl: '',
  status: 'DRAFT',
  isAvailable: true,
  isFeatured: false,
  order: '0',
  plans: [],
}

const blankPlan: ProductPlanRow = {
  id: '',
  nameTh: '',
  nameEn: '',
  price: '',
  billing: 'ONE_TIME',
  includesTh: '',
  includesEn: '',
  buyUrl: '',
  isPopular: false,
}

export function ProductForm({ product }: { product: ProductFormData }) {
  const [state, formAction, isPending] = useActionState(saveProduct, initialAdminState)

  useActionToast(state)
  const isEditing = Boolean(product.id)

  return (
    <div className="space-y-6">
      <AdminForm
        action={formAction}
        state={state}
        isPending={isPending}
        guardLabel="ผลิตภัณฑ์"
        saveLabel={isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มผลิตภัณฑ์'}
        className="space-y-6"
      >
        {isEditing && (
          <>
            <input type="hidden" name="id" value={product.id} />
            <VersionField initial={product.version} state={state} />
          </>
        )}

        <AdminCard title="ข้อมูลผลิตภัณฑ์">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="type" label="ประเภท" required hint="บอกลูกค้าว่าได้รับของแบบไหน และใช้จัดกลุ่มในหน้าผลิตภัณฑ์">
              <Select id="type" name="type" defaultValue={product.type}>
                {Object.values(ProductType).map((type) => (
                  <option key={type} value={type}>
                    {productTypeLabels[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="status" label="สถานะ" hint="ขึ้นหน้าเว็บเฉพาะ “เผยแพร่แล้ว”">
              <Select id="status" name="status" defaultValue={product.status}>
                {Object.values(ContentStatus).map((status) => (
                  <option key={status} value={status}>
                    {contentStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="slug" label="slug" hint="เว้นว่างได้ ระบบสร้างจากชื่อภาษาอังกฤษ">
              <Input id="slug" name="slug" defaultValue={product.slug} />
            </Field>
            <Field htmlFor="order" label="ลำดับการแสดง">
              <Input id="order" name="order" type="number" defaultValue={product.order} />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <label className="flex items-center gap-2.5">
              <input type="checkbox" name="isAvailable" defaultChecked={product.isAvailable} className="h-4 w-4 accent-[hsl(var(--accent))]" />
              เปิดรับคำสั่งซื้อ (ปิด = ขึ้นป้าย “ปิดรับชั่วคราว”)
            </label>
            <label className="flex items-center gap-2.5">
              <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} className="h-4 w-4 accent-[hsl(var(--accent))]" />
              แสดงขึ้นก่อนในรายการ
            </label>
          </div>
        </AdminCard>

        <BilingualTabs
          th={
            <>
              <Field htmlFor="nameTh" label="ชื่อผลิตภัณฑ์" required>
                <Input id="nameTh" name="nameTh" required defaultValue={product.nameTh} />
              </Field>
              <Field htmlFor="taglineTh" label="คำโปรย" required hint="หนึ่งประโยค บอกว่าช่วยใครทำอะไร ขึ้นบนการ์ดและผลค้นหา">
                <Input id="taglineTh" name="taglineTh" required defaultValue={product.taglineTh} />
              </Field>
              <Field htmlFor="descriptionTh" label="รายละเอียด" hint="เขียนแบบ Markdown ได้ เช่น ## หัวข้อ, - รายการ">
                <Textarea id="descriptionTh" name="descriptionTh" defaultValue={product.descriptionTh} className="min-h-40" />
              </Field>
              <PairInput
                name="featuresTh"
                label="จุดเด่น"
                initial={product.featuresTh}
                keyPlaceholder="หัวข้อ เช่น ออกใบกำกับภาษีได้ทันที"
                valuePlaceholder="อธิบายสั้น ๆ ว่าช่วยอะไร"
                valueMultiline
                addLabel="เพิ่มจุดเด่น"
              />
              <PairInput
                name="faqTh"
                label="คำถามที่พบบ่อย"
                initial={product.faqTh}
                keyPlaceholder="คำถาม"
                valuePlaceholder="คำตอบ"
                valueMultiline
                addLabel="เพิ่มคำถาม"
              />
            </>
          }
          en={
            <>
              <Field htmlFor="nameEn" label="Product name">
                <Input id="nameEn" name="nameEn" defaultValue={product.nameEn} />
              </Field>
              <Field htmlFor="taglineEn" label="Tagline">
                <Input id="taglineEn" name="taglineEn" defaultValue={product.taglineEn} />
              </Field>
              <Field htmlFor="descriptionEn" label="Description" hint="Markdown supported">
                <Textarea id="descriptionEn" name="descriptionEn" defaultValue={product.descriptionEn} className="min-h-40" />
              </Field>
              <PairInput
                name="featuresEn"
                label="Highlights"
                initial={product.featuresEn}
                keyPlaceholder="Title"
                valuePlaceholder="Short explanation"
                valueMultiline
                addLabel="Add highlight"
              />
              <PairInput
                name="faqEn"
                label="FAQ"
                initial={product.faqEn}
                keyPlaceholder="Question"
                valuePlaceholder="Answer"
                valueMultiline
                addLabel="Add question"
              />
            </>
          }
        />

        <AdminCard title="ภาพ วิดีโอ และลิงก์">
          <div className="space-y-5">
            <ImageField name="coverImage" label="ภาพปก" initial={product.coverImage} folder="products" hint="สัดส่วน 16:10 ใช้ทั้งบนการ์ดและหัวหน้ารายละเอียด" />
            <ImageListField name="gallery" label="ภาพตัวอย่างหน้าจอ / ตัวสินค้า" initial={product.gallery} folder="products" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="videoUrl" label="วิดีโอแนะนำ" hint="ลิงก์ YouTube หรือ Vimeo">
                <Input id="videoUrl" name="videoUrl" type="url" defaultValue={product.videoUrl} placeholder="https://youtu.be/…" />
              </Field>
              <Field htmlFor="demoUrl" label="ลิงก์ทดลองใช้" hint="เดโมออนไลน์หรือดาวน์โหลดตัวทดลอง">
                <Input id="demoUrl" name="demoUrl" type="url" defaultValue={product.demoUrl} placeholder="https://" />
              </Field>
              <Field htmlFor="buyUrl" label="ลิงก์ร้านค้า" hint="ใช้กับแพ็กเกจที่ไม่มีลิงก์ของตัวเอง เว้นว่าง = รับคำขอผ่านฟอร์มอย่างเดียว">
                <Input id="buyUrl" name="buyUrl" type="url" defaultValue={product.buyUrl} placeholder="https://" />
              </Field>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="สเปกและความต้องการระบบ">
          <SpecInput name="specs" initial={product.specs} />
        </AdminCard>

        <AdminCard title="แพ็กเกจราคา">
          <PlansEditor initial={product.plans} />
        </AdminCard>

        {state.message && (
          <FormMessage status={state.status === 'error' ? 'error' : 'success'}>{state.message}</FormMessage>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="lg">{isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มผลิตภัณฑ์'}</SubmitButton>
          <Link href="/admin/products" className={buttonClasses('outline', 'lg')}>
            ยกเลิก
          </Link>
        </div>
      </AdminForm>

      {isEditing && (
        <form
          action={deleteProduct}
          className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5"
        >
          <input type="hidden" name="id" value={product.id} />
          <div>
            <p className="text-sm font-medium">ลบผลิตภัณฑ์นี้</p>
            <p className="text-xs text-muted-foreground">
              คำขอของลูกค้าที่เคยส่งมายังเก็บชื่อและราคาที่เห็นตอนนั้นไว้ ถ้าแค่อยากซ่อน ให้เปลี่ยนสถานะเป็นฉบับร่างแทน
            </p>
          </div>
          <ConfirmSubmitButton variant="outline" size="sm" pendingLabel="กำลังลบ">
            ลบถาวร
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  )
}

/**
 * แพ็กเกจราคา — แต่ละแถวพก id ของตัวเอง (planId) ฝั่ง server แก้ทีละแถวตาม id
 * key ของแถวเป็นเลขประจำแถว ไม่ใช่ดัชนี ลบแถวกลางแล้วค่าในช่องที่เหลือไม่เลื่อนผิดแถว
 */
function PlansEditor({ initial }: { initial: ProductPlanRow[] }) {
  const [rows, setRows] = useState(() =>
    (initial.length ? initial : [blankPlan]).map((plan, index) => ({ key: index, plan })),
  )
  const [popularKey, setPopularKey] = useState<number | null>(
    () => rows.find((row) => row.plan.isPopular)?.key ?? null,
  )
  // ฝั่ง server จับคู่แพ็กเกจยอดนิยมจากลำดับที่ส่งไป จึงแปลงเลขประจำแถวกลับเป็นดัชนีปัจจุบันตอนส่ง
  const popularIndex = rows.findIndex((row) => row.key === popularKey)

  const add = () =>
    setRows((current) => [...current, { key: current.reduce((max, row) => Math.max(max, row.key), -1) + 1, plan: blankPlan }])

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        ราคาว่างหรือเลือก “สอบถามราคา” = ไม่แสดงตัวเลข ลิงก์ซื้อของแพ็กเกจใช้แทนลิงก์ร้านค้าของผลิตภัณฑ์
        เว้นว่างทั้งสองช่อง ปุ่มของแพ็กเกจจะพาลูกค้าไปกรอกฟอร์มขอซื้อแทน
        “เริ่มต้น” บนการ์ดคือแพ็กเกจที่ถูกที่สุด ค่าต่ออายุหรือของเสริมจึงควรเขียนไว้ในสิ่งที่ได้รับ ไม่ใช่แยกเป็นแพ็กเกจ
      </p>
      <input type="hidden" name="planPopular" value={popularIndex >= 0 ? popularIndex : ''} />

      {rows.map(({ key, plan }, index) => (
        <div key={key} className="rounded-lg border border-border p-4">
          <input type="hidden" name="planId" value={plan.id} />
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">แพ็กเกจที่ {index + 1}</p>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="planPopularPicker"
                  checked={popularKey === key}
                  onChange={() => setPopularKey(key)}
                  className="accent-[hsl(var(--accent))]"
                />
                เลือกมากที่สุด
              </label>
              <button
                type="button"
                onClick={() => {
                  setRows((current) => current.filter((row) => row.key !== key))
                  if (popularKey === key) setPopularKey(null)
                }}
                aria-label={`ลบแพ็กเกจที่ ${index + 1}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
              >
                <Trash2 size={15} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">ชื่อแพ็กเกจ (ไทย)</label>
              <Input name="planNameTh" defaultValue={plan.nameTh} placeholder="มาตรฐาน" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Plan name (EN)</label>
              <Input name="planNameEn" defaultValue={plan.nameEn} placeholder="Standard" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">ราคา (บาท)</label>
              <Input name="planPrice" inputMode="numeric" defaultValue={plan.price} placeholder="4900" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">รอบการคิดเงิน</label>
              <Select name="planBilling" defaultValue={plan.billing}>
                {Object.values(BillingCycle).map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {billingCycleLabels[cycle]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">สิ่งที่ได้รับ (ไทย) — บรรทัดละหนึ่งข้อ</label>
              <Textarea name="planIncludesTh" defaultValue={plan.includesTh} className="min-h-28 text-xs" placeholder={'ใช้ได้ 1 เครื่อง\nอัปเดตฟรี 1 ปี'} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">What you get (EN) — one per line</label>
              <Textarea name="planIncludesEn" defaultValue={plan.includesEn} className="min-h-28 text-xs" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium">ลิงก์ซื้อของแพ็กเกจนี้ (ไม่บังคับ)</label>
              <Input name="planBuyUrl" type="url" defaultValue={plan.buyUrl} placeholder="https://" />
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm text-accent transition-opacity hover:opacity-80">
        <Plus size={15} strokeWidth={2} />
        เพิ่มแพ็กเกจ
      </button>
    </div>
  )
}
