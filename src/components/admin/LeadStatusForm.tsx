'use client'

import { useActionState, useRef } from 'react'
import { LeadStatus } from '@/generated/prisma/enums'
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
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(updateLeadStatus, initialAdminState)

  useActionToast(state)

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1.5">
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
        onChange={() => formRef.current?.requestSubmit()}
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
    </form>
  )
}
