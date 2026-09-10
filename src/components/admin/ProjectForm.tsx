'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { ContentStatus, ServiceCategory } from '@/generated/prisma/enums'
import {
  BilingualTabs,
  ConfirmSubmitButton,
  PairInput,
  RepeatableInput,
  SubmitButton,
  VersionField,
} from '@/components/admin/AdminUI'
import { AdminCard } from '@/components/admin/AdminPage'
import { useActionToast } from '@/components/ui/Toast'
import { ImageField, ImageListField } from '@/components/admin/ImageField'
import { buttonClasses } from '@/components/ui/Button'
import { Field, FormMessage, Input, Select, Textarea } from '@/components/ui/Form'
import { contentStatusLabels, serviceCategoryLabels } from '@/lib/admin-labels'
import { initialAdminState } from '@/server/admin-state'
import { deleteProject, saveProject } from '@/server/cms-actions'

export type ProjectFormData = {
  id: string
  /** เวลาแก้ล่าสุดของระเบียนที่หน้านี้เรนเดอร์มา — กันการบันทึกทับข้อมูลที่ใหม่กว่า */
  version: string
  slug: string
  category: ServiceCategory
  titleTh: string
  titleEn: string
  summaryTh: string
  summaryEn: string
  bodyTh: string
  bodyEn: string
  clientName: string
  year: string
  location: string
  coverImage: string
  videoUrl: string
  liveUrl: string
  repoUrl: string
  techStack: string[]
  creditsTh: { key: string; value: string }[]
  creditsEn: { key: string; value: string }[]
  mediaUrls: string[]
  isFeatured: boolean
  status: ContentStatus
  order: string
}

export const emptyProject: ProjectFormData = {
  id: '',
  version: '',
  slug: '',
  category: 'WEB',
  titleTh: '',
  titleEn: '',
  summaryTh: '',
  summaryEn: '',
  bodyTh: '',
  bodyEn: '',
  clientName: '',
  year: String(new Date().getFullYear()),
  location: '',
  coverImage: '',
  videoUrl: '',
  liveUrl: '',
  repoUrl: '',
  techStack: [],
  creditsTh: [],
  creditsEn: [],
  mediaUrls: [],
  isFeatured: false,
  status: 'DRAFT',
  order: '0',
}

export function ProjectForm({ project }: { project: ProjectFormData }) {
  const [state, formAction] = useActionState(saveProject, initialAdminState)

  useActionToast(state)
  const isEditing = Boolean(project.id)

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        {isEditing && (
          <>
            <input type="hidden" name="id" value={project.id} />
            <VersionField initial={project.version} state={state} />
          </>
        )}

        <AdminCard title="ข้อมูลหลัก">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="category" label="ประเภทงาน" required>
              <Select id="category" name="category" defaultValue={project.category}>
                {Object.values(ServiceCategory).map((category) => (
                  <option key={category} value={category}>
                    {serviceCategoryLabels[category]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="status" label="สถานะ" required>
              <Select id="status" name="status" defaultValue={project.status}>
                {Object.values(ContentStatus).map((status) => (
                  <option key={status} value={status}>
                    {contentStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              htmlFor="slug"
              label="slug (ส่วนท้าย URL)"
              hint="เว้นว่างได้ ระบบจะสร้างจากชื่อผลงานให้"
            >
              <Input id="slug" name="slug" defaultValue={project.slug} placeholder="siriwat-group-site" />
            </Field>

            <Field htmlFor="clientName" label="ชื่อลูกค้า">
              <Input id="clientName" name="clientName" defaultValue={project.clientName} />
            </Field>

            <Field htmlFor="year" label="ปีที่ทำ">
              <Input id="year" name="year" type="number" min="2000" max="2100" defaultValue={project.year} />
            </Field>

            <Field htmlFor="location" label="สถานที่">
              <Input id="location" name="location" defaultValue={project.location} />
            </Field>
          </div>
        </AdminCard>

        <BilingualTabs
          th={
            <>
              <Field htmlFor="titleTh" label="ชื่อผลงาน" required>
                <Input id="titleTh" name="titleTh" required defaultValue={project.titleTh} />
              </Field>
              <Field htmlFor="summaryTh" label="สรุปสั้น" hint="แสดงบนการ์ดในหน้ารวมผลงาน">
                <Textarea id="summaryTh" name="summaryTh" defaultValue={project.summaryTh} className="min-h-20" />
              </Field>
              <Field htmlFor="bodyTh" label="เนื้อหาแบบเต็ม" hint="รองรับ Markdown: ## หัวข้อ, **ตัวหนา**, - รายการ">
                <Textarea id="bodyTh" name="bodyTh" defaultValue={project.bodyTh} className="min-h-56 font-mono text-xs" />
              </Field>
              <PairInput
                name="creditsTh"
                label="เครดิตทีมงาน"
                initial={project.creditsTh}
                keyPlaceholder="ตำแหน่ง เช่น ผู้กำกับ"
                valuePlaceholder="ชื่อ"
              />
            </>
          }
          en={
            <>
              <Field htmlFor="titleEn" label="Title" hint="เว้นว่างได้ จะใช้ชื่อภาษาไทยแทน">
                <Input id="titleEn" name="titleEn" defaultValue={project.titleEn} />
              </Field>
              <Field htmlFor="summaryEn" label="Summary">
                <Textarea id="summaryEn" name="summaryEn" defaultValue={project.summaryEn} className="min-h-20" />
              </Field>
              <Field htmlFor="bodyEn" label="Full content">
                <Textarea id="bodyEn" name="bodyEn" defaultValue={project.bodyEn} className="min-h-56 font-mono text-xs" />
              </Field>
              <PairInput
                name="creditsEn"
                label="Credits"
                initial={project.creditsEn}
                keyPlaceholder="Role"
                valuePlaceholder="Name"
              />
            </>
          }
        />

        <AdminCard title="รูปภาพและลิงก์">
          <div className="space-y-5">
            <ImageField
              name="coverImage"
              label="รูปปก"
              initial={project.coverImage}
              folder="projects"
              required
              hint="สัดส่วนแนวนอนจะดูดีที่สุดบนการ์ดผลงาน"
            />

            <ImageListField
              name="mediaUrl"
              label="รูปในแกลเลอรี"
              initial={project.mediaUrls}
              folder="projects"
              hint="ลำดับที่เห็นคือลำดับที่แสดงบนหน้าเว็บ"
            />

            <div className="grid gap-5 sm:grid-cols-3">
              <Field htmlFor="videoUrl" label="ลิงก์วิดีโอ" hint="YouTube หรือ Vimeo">
                <Input id="videoUrl" name="videoUrl" defaultValue={project.videoUrl} />
              </Field>
              <Field htmlFor="liveUrl" label="ลิงก์เว็บไซต์จริง">
                <Input id="liveUrl" name="liveUrl" defaultValue={project.liveUrl} />
              </Field>
              <Field htmlFor="repoUrl" label="ลิงก์ซอร์สโค้ด">
                <Input id="repoUrl" name="repoUrl" defaultValue={project.repoUrl} />
              </Field>
            </div>

            <RepeatableInput
              name="techStack"
              label="เทคโนโลยีที่ใช้"
              initial={project.techStack}
              placeholder="Next.js"
              addLabel="เพิ่มเทคโนโลยี"
            />
          </div>
        </AdminCard>

        <AdminCard title="การแสดงผล">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="order" label="ลำดับการแสดง" hint="เลขน้อยขึ้นก่อน">
              <Input id="order" name="order" type="number" defaultValue={project.order} />
            </Field>
            <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={project.isFeatured}
                className="h-4 w-4 accent-[hsl(var(--accent))]"
              />
              แสดงเป็นผลงานเด่นบนหน้าแรก
            </label>
          </div>
        </AdminCard>

        {state.message && (
          <FormMessage status={state.status === 'error' ? 'error' : 'success'}>
            {state.message}
          </FormMessage>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="lg">{isEditing ? 'บันทึกการแก้ไข' : 'สร้างผลงาน'}</SubmitButton>
          <Link href="/admin/projects" className={buttonClasses('outline', 'lg')}>
            ยกเลิก
          </Link>
        </div>
      </form>

      {isEditing && (
        <form
          action={deleteProject}
          className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5"
        >
          <input type="hidden" name="id" value={project.id} />
          <div>
            <p className="text-sm font-medium">ลบผลงานนี้</p>
            <p className="text-xs text-muted-foreground">ลบแล้วกู้คืนไม่ได้ รวมถึงรูปในแกลเลอรีทั้งหมด</p>
          </div>
          <ConfirmSubmitButton variant="outline" size="sm" pendingLabel="กำลังลบ">
            ลบถาวร
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  )
}
