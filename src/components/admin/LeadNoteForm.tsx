'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useActionToast } from '@/components/ui/Toast'
import { Textarea } from '@/components/ui/Form'
import { initialAdminState } from '@/server/admin-state'
import { addLeadNote } from '@/server/admin-actions'

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(addLeadNote, initialAdminState)

  useActionToast(state)

  // ล้างช่องหลังบันทึกสำเร็จ เพื่อให้พิมพ์โน้ตถัดไปได้เลย
  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="note-body" className="sr-only">
        บันทึกภายใน
      </label>
      <Textarea
        id="note-body"
        name="body"
        required
        maxLength={2000}
        placeholder="บันทึกภายใน เช่น โทรไปแล้วไม่รับ นัดคุยวันจันทร์ 10 โมง"
        className="min-h-24"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'กำลังบันทึก' : 'บันทึกโน้ต'}
        </Button>
        {state.message && (
          <p
            role="status"
            className={`text-xs ${state.status === 'error' ? 'text-destructive' : 'text-success'}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
