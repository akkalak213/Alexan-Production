'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { ContentStatus } from '@/generated/prisma/enums'
import { AdminCard } from '@/components/admin/AdminPage'
import { useActionToast } from '@/components/ui/Toast'
import {
  BilingualTabs,
  ConfirmSubmitButton,
  RepeatableInput,
  SubmitButton,
  VersionField,
} from '@/components/admin/AdminUI'
import { ImageField } from '@/components/admin/ImageField'
import { buttonClasses } from '@/components/ui/Button'
import { Field, FormMessage, Input, Select, Textarea } from '@/components/ui/Form'
import { contentStatusLabels } from '@/lib/admin-labels'
import { initialAdminState } from '@/server/admin-state'
import { deletePost, savePost } from '@/server/cms-actions'

export type PostFormData = {
  id: string
  /** เวลาแก้ล่าสุดของระเบียนที่หน้านี้เรนเดอร์มา — กันการบันทึกทับข้อมูลที่ใหม่กว่า */
  version: string
  slug: string
  titleTh: string
  titleEn: string
  excerptTh: string
  excerptEn: string
  bodyTh: string
  bodyEn: string
  coverImage: string
  tags: string[]
  isFeatured: boolean
  status: ContentStatus
}

export const emptyPost: PostFormData = {
  id: '',
  version: '',
  slug: '',
  titleTh: '',
  titleEn: '',
  excerptTh: '',
  excerptEn: '',
  bodyTh: '',
  bodyEn: '',
  coverImage: '',
  tags: [],
  isFeatured: false,
  status: 'DRAFT',
}

export function PostForm({ post }: { post: PostFormData }) {
  const [state, formAction] = useActionState(savePost, initialAdminState)

  useActionToast(state)
  const isEditing = Boolean(post.id)

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        {isEditing && (
          <>
            <input type="hidden" name="id" value={post.id} />
            <VersionField initial={post.version} state={state} />
          </>
        )}

        <AdminCard title="ข้อมูลบทความ">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="status" label="สถานะ">
              <Select id="status" name="status" defaultValue={post.status}>
                {Object.values(ContentStatus).map((status) => (
                  <option key={status} value={status}>
                    {contentStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="slug" label="slug" hint="เว้นว่างได้ ระบบสร้างจากชื่อบทความ">
              <Input id="slug" name="slug" defaultValue={post.slug} />
            </Field>
          </div>
          <div className="mt-5 space-y-5">
            <ImageField
              name="coverImage"
              label="รูปปก"
              initial={post.coverImage}
              folder="blog"
              hint="แสดงบนการ์ดบทความและตอนแชร์ลงโซเชียล"
            />
            <RepeatableInput name="tags" label="แท็ก" initial={post.tags} addLabel="เพิ่มแท็ก" />
          </div>
        </AdminCard>

        <BilingualTabs
          th={
            <>
              <Field htmlFor="titleTh" label="ชื่อบทความ" required>
                <Input id="titleTh" name="titleTh" required defaultValue={post.titleTh} />
              </Field>
              <Field htmlFor="excerptTh" label="สรุปสั้น" hint="แสดงบนการ์ดและใน Google">
                <Textarea id="excerptTh" name="excerptTh" defaultValue={post.excerptTh} className="min-h-20" />
              </Field>
              <Field htmlFor="bodyTh" label="เนื้อหา" hint="Markdown — เวลาอ่านคำนวณให้อัตโนมัติ">
                <Textarea id="bodyTh" name="bodyTh" defaultValue={post.bodyTh} className="min-h-80 font-mono text-xs" />
              </Field>
            </>
          }
          en={
            <>
              <Field htmlFor="titleEn" label="Title">
                <Input id="titleEn" name="titleEn" defaultValue={post.titleEn} />
              </Field>
              <Field htmlFor="excerptEn" label="Excerpt">
                <Textarea id="excerptEn" name="excerptEn" defaultValue={post.excerptEn} className="min-h-20" />
              </Field>
              <Field htmlFor="bodyEn" label="Content" hint="เว้นว่างได้ จะใช้เนื้อหาภาษาไทยแทน">
                <Textarea id="bodyEn" name="bodyEn" defaultValue={post.bodyEn} className="min-h-80 font-mono text-xs" />
              </Field>
            </>
          }
        />

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={post.isFeatured}
            className="h-4 w-4 accent-[hsl(var(--accent))]"
          />
          ปักหมุดขึ้นก่อนในหน้ารวมบทความ
        </label>

        {state.message && (
          <FormMessage status={state.status === 'error' ? 'error' : 'success'}>
            {state.message}
          </FormMessage>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="lg">{isEditing ? 'บันทึกการแก้ไข' : 'สร้างบทความ'}</SubmitButton>
          <Link href="/admin/posts" className={buttonClasses('outline', 'lg')}>
            ยกเลิก
          </Link>
        </div>
      </form>

      {isEditing && (
        <form
          action={deletePost}
          className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5"
        >
          <input type="hidden" name="id" value={post.id} />
          <p className="text-sm font-medium">ลบบทความนี้</p>
          <ConfirmSubmitButton variant="outline" size="sm" pendingLabel="กำลังลบ">
            ลบถาวร
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  )
}
