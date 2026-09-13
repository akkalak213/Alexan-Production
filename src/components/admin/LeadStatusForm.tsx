'use client'

import { useActionState } from 'react'
import { LeadStatus } from '@/generated/prisma/enums'
import { AdminForm } from '@/components/admin/AdminForm'
import { Select } from '@/components/ui/Form'
import { useActionToast } from '@/components/ui/Toast'
import { leadStatusLabels } from '@/lib/admin-labels'
import { initialAdminState } from '@/server/admin-state'
import { updateLeadStatus } from '@/server/admin-actions'

const statuses = Object.values(LeadStatus)

export function LeadStatusForm({
  leadId,
  current,
}: {
  leadId: string
  current: LeadStatus
}) {
  const [state, formAction, isPending] = useActionState(updateLeadStatus, initialAdminState)

  useActionToast(state)

  /**
   * ใช้ AdminForm ด้วยแม้จะเป็นช่องเดียว
   * <form action> ของเดิมถูก React ล้างกลับเป็นค่าตั้งต้นหลังบันทึก ตัวเลือกจึงเด้งกลับไปเป็นสถานะเก่า
   * ทั้งที่ในฐานข้อมูลเปลี่ยนไปแล้ว
   */
  return (
    <AdminForm action={formAction} state={state} isPending={isPending} className="flex flex-col gap-1.5">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="lead-status" className="text-xs font-medium text-muted-foreground">
        สถานะ
      </label>
      <Select
        id="lead-status"
        name="status"
        defaultValue={current}
        disabled={isPending}
        // เปลี่ยนแล้วบันทึกทันที ไม่ต้องกดปุ่มเพิ่ม — เป็นงานที่ทำบ่อยมาก
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {leadStatusLabels[status]}
          </option>
        ))}
      </Select>
      {state.message && (
        <p
          role="status"
          className={`text-xs ${state.status === 'error' ? 'text-destructive' : 'text-success'}`}
        >
          {state.message}
        </p>
      )}
    </AdminForm>
  )
}
