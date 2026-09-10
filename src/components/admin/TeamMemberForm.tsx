'use client'

import { useActionState } from 'react'
import {
  ConfirmSubmitButton,
  SubmitButton,
  VersionField,
} from '@/components/admin/AdminUI'
import { useActionToast } from '@/components/ui/Toast'
import { ImageField } from '@/components/admin/ImageField'
import { Field, FormMessage, Input, Textarea } from '@/components/ui/Form'
import { initialAdminState } from '@/server/admin-state'
import { deleteTeamMember, saveTeamMember } from '@/server/cms-actions'

export type TeamMemberFormData = {
  id: string
  /** เวลาแก้ล่าสุดของระเบียนที่หน้านี้เรนเดอร์มา — กันการบันทึกทับข้อมูลที่ใหม่กว่า */
  version: string
  name: string
  roleTh: string
  roleEn: string
  bioTh: string
  bioEn: string
  photo: string
  email: string
  socials: Record<string, string>
  isActive: boolean
  order: string
}

export const emptyTeamMember: TeamMemberFormData = {
  id: '',
  version: '',
  name: '',
  roleTh: '',
  roleEn: '',
  bioTh: '',
  bioEn: '',
  photo: '',
  email: '',
  socials: {},
  isActive: true,
  order: '0',
}

const socialFields = ['instagram', 'facebook', 'linkedin', 'github', 'website'] as const

export function TeamMemberForm({ member }: { member: TeamMemberFormData }) {
  const [state, formAction] = useActionState(saveTeamMember, initialAdminState)

  useActionToast(state)
  const isEditing = Boolean(member.id)

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <form action={formAction} className="space-y-5">
        {isEditing && (
          <>
            <input type="hidden" name="id" value={member.id} />
            <VersionField initial={member.version} state={state} />
          </>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor={`name-${member.id}`} label="ชื่อ" required>
            <Input id={`name-${member.id}`} name="name" required defaultValue={member.name} />
          </Field>
          <ImageField
            name="photo"
            label="รูปประจำตัว"
            initial={member.photo}
            folder="team"
            hint="รูปสี่เหลี่ยมจัตุรัสจะครอบได้พอดีที่สุด"
          />
          <Field htmlFor={`roleTh-${member.id}`} label="ตำแหน่ง (ไทย)">
            <Input id={`roleTh-${member.id}`} name="roleTh" defaultValue={member.roleTh} />
          </Field>
          <Field htmlFor={`roleEn-${member.id}`} label="Role (EN)">
            <Input id={`roleEn-${member.id}`} name="roleEn" defaultValue={member.roleEn} />
          </Field>
          <Field htmlFor={`bioTh-${member.id}`} label="แนะนำตัว (ไทย)">
            <Textarea
              id={`bioTh-${member.id}`}
              name="bioTh"
              defaultValue={member.bioTh}
              className="min-h-24"
            />
          </Field>
          <Field htmlFor={`bioEn-${member.id}`} label="Bio (EN)">
            <Textarea
              id={`bioEn-${member.id}`}
              name="bioEn"
              defaultValue={member.bioEn}
              className="min-h-24"
            />
          </Field>
        </div>

        <details className="rounded-md border border-border">
          <summary className="cursor-pointer px-4 py-2.5 text-sm text-muted-foreground">
            อีเมลและโซเชียล
          </summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
            <Field htmlFor={`email-${member.id}`} label="อีเมล">
              <Input id={`email-${member.id}`} name="email" type="email" defaultValue={member.email} />
            </Field>
            {socialFields.map((key) => (
              <Field key={key} htmlFor={`${key}-${member.id}`} label={key}>
                <Input
                  id={`${key}-${member.id}`}
                  name={`social_${key}`}
                  defaultValue={member.socials[key] ?? ''}
                  placeholder="https://"
                />
              </Field>
            ))}
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-4">
          <Field htmlFor={`order-${member.id}`} label="ลำดับ" className="w-24">
            <Input id={`order-${member.id}`} name="order" type="number" defaultValue={member.order} />
          </Field>
          <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={member.isActive}
              className="h-4 w-4 accent-[hsl(var(--accent))]"
            />
            แสดงบนหน้า /about
          </label>
        </div>

        {state.message && (
          <FormMessage status={state.status === 'error' ? 'error' : 'success'}>
            {state.message}
          </FormMessage>
        )}

        <SubmitButton size="sm">{isEditing ? 'บันทึก' : 'เพิ่มสมาชิก'}</SubmitButton>
      </form>

      {isEditing && (
        <form action={deleteTeamMember} className="mt-4 border-t border-border pt-4">
          <input type="hidden" name="id" value={member.id} />
          <ConfirmSubmitButton variant="ghost" size="sm" pendingLabel="กำลังลบ">
            ลบสมาชิกคนนี้
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  )
}
