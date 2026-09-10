'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { EquipmentCategory, EquipmentStatus } from '@/generated/prisma/enums'
import { AdminCard } from '@/components/admin/AdminPage'
import { useActionToast } from '@/components/ui/Toast'
import {
  BilingualTabs,
  ConfirmSubmitButton,
  PairInput,
  SubmitButton,
  VersionField,
} from '@/components/admin/AdminUI'
import { ImageField, ImageListField } from '@/components/admin/ImageField'
import { buttonClasses } from '@/components/ui/Button'
import { Field, FormMessage, Input, Select, Textarea } from '@/components/ui/Form'
import { equipmentCategoryLabels, equipmentStatusLabels } from '@/lib/admin-labels'
import { initialAdminState } from '@/server/admin-state'
import { deleteEquipment, saveEquipment } from '@/server/cms-actions'

export type EquipmentFormData = {
  id: string
  /** เวลาแก้ล่าสุดของระเบียนที่หน้านี้เรนเดอร์มา — กันการบันทึกทับข้อมูลที่ใหม่กว่า */
  version: string
  slug: string
  category: EquipmentCategory
  brand: string
  model: string
  nameTh: string
  nameEn: string
  descriptionTh: string
  descriptionEn: string
  specs: { key: string; value: string }[]
  dailyRate: string
  weeklyRate: string
  depositAmount: string
  image: string
  gallery: string[]
  quantity: string
  status: EquipmentStatus
  isFeatured: boolean
  isActive: boolean
  order: string
}

export const emptyEquipment: EquipmentFormData = {
  id: '',
  version: '',
  slug: '',
  category: 'CAMERA',
  brand: '',
  model: '',
  nameTh: '',
  nameEn: '',
  descriptionTh: '',
  descriptionEn: '',
  specs: [],
  dailyRate: '',
  weeklyRate: '',
  depositAmount: '',
  image: '',
  gallery: [],
  quantity: '1',
  status: 'AVAILABLE',
  isFeatured: false,
  isActive: true,
  order: '0',
}

export function EquipmentForm({ item }: { item: EquipmentFormData }) {
  const [state, formAction] = useActionState(saveEquipment, initialAdminState)

  useActionToast(state)
  const isEditing = Boolean(item.id)

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        {isEditing && (
          <>
            <input type="hidden" name="id" value={item.id} />
            <VersionField initial={item.version} state={state} />
          </>
        )}

        <AdminCard title="ข้อมูลอุปกรณ์">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="brand" label="ยี่ห้อ" required>
              <Input id="brand" name="brand" required defaultValue={item.brand} placeholder="Sony" />
            </Field>
            <Field htmlFor="model" label="รุ่น" required>
              <Input id="model" name="model" required defaultValue={item.model} placeholder="FX3" />
            </Field>
            <Field htmlFor="category" label="ประเภท" required>
              <Select id="category" name="category" defaultValue={item.category}>
                {Object.values(EquipmentCategory).map((category) => (
                  <option key={category} value={category}>
                    {equipmentCategoryLabels[category]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="status" label="สถานะ">
              <Select id="status" name="status" defaultValue={item.status}>
                {Object.values(EquipmentStatus).map((status) => (
                  <option key={status} value={status}>
                    {equipmentStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="slug" label="slug" hint="เว้นว่างได้ ระบบสร้างจากยี่ห้อและรุ่น">
              <Input id="slug" name="slug" defaultValue={item.slug} />
            </Field>
            <Field htmlFor="quantity" label="จำนวนที่มี">
              <Input id="quantity" name="quantity" type="number" min="0" defaultValue={item.quantity} />
            </Field>
          </div>
        </AdminCard>

        <AdminCard title="ราคา">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field htmlFor="dailyRate" label="ค่าเช่าต่อวัน (บาท)">
              <Input id="dailyRate" name="dailyRate" inputMode="numeric" defaultValue={item.dailyRate} />
            </Field>
            <Field htmlFor="weeklyRate" label="ค่าเช่าต่อสัปดาห์ (บาท)">
              <Input id="weeklyRate" name="weeklyRate" inputMode="numeric" defaultValue={item.weeklyRate} />
            </Field>
            <Field htmlFor="depositAmount" label="เงินมัดจำ (บาท)">
              <Input
                id="depositAmount"
                name="depositAmount"
                inputMode="numeric"
                defaultValue={item.depositAmount}
              />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            เว้นว่างไว้ = ไม่แสดงราคาบนหน้าเว็บ ลูกค้าต้องสอบถาม
          </p>
        </AdminCard>

        <BilingualTabs
          th={
            <>
              <Field htmlFor="nameTh" label="ชื่อที่แสดง" hint="เว้นว่างได้ จะใช้ยี่ห้อและรุ่น">
                <Input id="nameTh" name="nameTh" defaultValue={item.nameTh} />
              </Field>
              <Field htmlFor="descriptionTh" label="คำอธิบาย">
                <Textarea
                  id="descriptionTh"
                  name="descriptionTh"
                  defaultValue={item.descriptionTh}
                  className="min-h-24"
                />
              </Field>
            </>
          }
          en={
            <>
              <Field htmlFor="nameEn" label="Display name">
                <Input id="nameEn" name="nameEn" defaultValue={item.nameEn} />
              </Field>
              <Field htmlFor="descriptionEn" label="Description">
                <Textarea
                  id="descriptionEn"
                  name="descriptionEn"
                  defaultValue={item.descriptionEn}
                  className="min-h-24"
                />
              </Field>
            </>
          }
        />

        <AdminCard title="สเปกและรูปภาพ">
          <div className="space-y-5">
            <PairInput
              name="specs"
              label="สเปก"
              initial={item.specs}
              keyPlaceholder="หัวข้อ เช่น เซนเซอร์"
              valuePlaceholder="ค่า เช่น Full-frame 10.2MP"
              addLabel="เพิ่มสเปก"
            />
            <ImageField
              name="image"
              label="รูปหลัก"
              initial={item.image}
              folder="equipment"
              hint="ถ่ายบนพื้นเรียบสีเดียวจะดูเป็นระเบียบที่สุด"
            />
            <ImageListField
              name="gallery"
              label="รูปเพิ่มเติม"
              initial={item.gallery}
              folder="equipment"
            />
          </div>
        </AdminCard>

        <AdminCard title="การแสดงผล">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="order" label="ลำดับการแสดง">
              <Input id="order" name="order" type="number" defaultValue={item.order} />
            </Field>
            <div className="flex flex-col gap-3 self-end pb-2.5 text-sm">
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={item.isActive}
                  className="h-4 w-4 accent-[hsl(var(--accent))]"
                />
                แสดงบนหน้าเว็บ
              </label>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={item.isFeatured}
                  className="h-4 w-4 accent-[hsl(var(--accent))]"
                />
                แสดงขึ้นก่อนในรายการ
              </label>
            </div>
          </div>
        </AdminCard>

        {state.message && (
          <FormMessage status={state.status === 'error' ? 'error' : 'success'}>
            {state.message}
          </FormMessage>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="lg">{isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มอุปกรณ์'}</SubmitButton>
          <Link href="/admin/equipment" className={buttonClasses('outline', 'lg')}>
            ยกเลิก
          </Link>
        </div>
      </form>

      {isEditing && (
        <form
          action={deleteEquipment}
          className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5"
        >
          <input type="hidden" name="id" value={item.id} />
          <div>
            <p className="text-sm font-medium">ลบอุปกรณ์นี้</p>
            <p className="text-xs text-muted-foreground">
              ถ้าเคยมีลูกค้าขอเช่า ประวัติคำขอจะยังเก็บชื่ออุปกรณ์ไว้
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
