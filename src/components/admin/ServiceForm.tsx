'use client'

import { useActionState } from 'react'
import { AdminCard } from '@/components/admin/AdminPage'
import { useActionToast } from '@/components/ui/Toast'
import {
  BilingualTabs,
  PairInput,
  RepeatableInput,
  SubmitButton,
  VersionField,
} from '@/components/admin/AdminUI'
import { ImageField } from '@/components/admin/ImageField'
import { Field, FormMessage, Input, Select, Textarea } from '@/components/ui/Form'
import { iconMap } from '@/lib/icons'
import { initialAdminState } from '@/server/admin-state'
import { saveService } from '@/server/cms-actions'

export type ServiceFormData = {
  id: string
  /** เวลาแก้ล่าสุดของระเบียนที่หน้านี้เรนเดอร์มา — กันการบันทึกทับข้อมูลที่ใหม่กว่า */
  version: string
  slug: string
  icon: string
  coverImage: string
  titleTh: string
  titleEn: string
  taglineTh: string
  taglineEn: string
  descriptionTh: string
  descriptionEn: string
  highlightsTh: string[]
  highlightsEn: string[]
  processTh: { key: string; value: string }[]
  processEn: { key: string; value: string }[]
  faqTh: { key: string; value: string }[]
  faqEn: { key: string; value: string }[]
  isActive: boolean
  order: string
}

export function ServiceForm({ service }: { service: ServiceFormData }) {
  const [state, formAction] = useActionState(saveService, initialAdminState)

  useActionToast(state)

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={service.id} />
      <VersionField initial={service.version} state={state} />

      <AdminCard title="การแสดงผล">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field htmlFor="icon" label="ไอคอน">
            <Select id="icon" name="icon" defaultValue={service.icon}>
              {Object.keys(iconMap).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="order" label="ลำดับ">
            <Input id="order" name="order" type="number" defaultValue={service.order} />
          </Field>
          <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={service.isActive}
              className="h-4 w-4 accent-[hsl(var(--accent))]"
            />
            แสดงบนหน้าเว็บ
          </label>
        </div>
        <div className="mt-5">
          <ImageField
            name="coverImage"
            label="รูปประกอบ"
            initial={service.coverImage}
            folder="services"
          />
        </div>
      </AdminCard>

      <BilingualTabs
        th={
          <>
            <Field htmlFor="titleTh" label="ชื่อบริการ" required>
              <Input id="titleTh" name="titleTh" required defaultValue={service.titleTh} />
            </Field>
            <Field htmlFor="taglineTh" label="ประโยคดึงดูด" hint="แสดงบนการ์ดหน้าแรก ควรสั้นและตรงประเด็น">
              <Input id="taglineTh" name="taglineTh" defaultValue={service.taglineTh} />
            </Field>
            <Field htmlFor="descriptionTh" label="คำอธิบายเต็ม">
              <Textarea
                id="descriptionTh"
                name="descriptionTh"
                defaultValue={service.descriptionTh}
                className="min-h-32"
              />
            </Field>
            <RepeatableInput
              name="highlightsTh"
              label="จุดเด่น"
              initial={service.highlightsTh}
              addLabel="เพิ่มจุดเด่น"
            />
            <PairInput
              name="processTh"
              label="ขั้นตอนการทำงาน"
              initial={service.processTh}
              keyPlaceholder="ชื่อขั้นตอน"
              valuePlaceholder="รายละเอียด"
              valueMultiline
              addLabel="เพิ่มขั้นตอน"
            />
            <PairInput
              name="faqTh"
              label="คำถามที่พบบ่อย"
              initial={service.faqTh}
              keyPlaceholder="คำถาม"
              valuePlaceholder="คำตอบ"
              valueMultiline
              addLabel="เพิ่มคำถาม"
            />
          </>
        }
        en={
          <>
            <Field htmlFor="titleEn" label="Service name">
              <Input id="titleEn" name="titleEn" defaultValue={service.titleEn} />
            </Field>
            <Field htmlFor="taglineEn" label="Tagline">
              <Input id="taglineEn" name="taglineEn" defaultValue={service.taglineEn} />
            </Field>
            <Field htmlFor="descriptionEn" label="Full description">
              <Textarea
                id="descriptionEn"
                name="descriptionEn"
                defaultValue={service.descriptionEn}
                className="min-h-32"
              />
            </Field>
            <RepeatableInput
              name="highlightsEn"
              label="Highlights"
              initial={service.highlightsEn}
              addLabel="Add highlight"
            />
            <PairInput
              name="processEn"
              label="Process"
              initial={service.processEn}
              keyPlaceholder="Step title"
              valuePlaceholder="Detail"
              valueMultiline
              addLabel="Add step"
            />
            <PairInput
              name="faqEn"
              label="FAQ"
              initial={service.faqEn}
              keyPlaceholder="Question"
              valuePlaceholder="Answer"
              valueMultiline
              addLabel="Add question"
            />
          </>
        }
      />

      {state.message && (
        <FormMessage status={state.status === 'error' ? 'error' : 'success'}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton size="lg">บันทึกเนื้อหาบริการ</SubmitButton>
    </form>
  )
}
