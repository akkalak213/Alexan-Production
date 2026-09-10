'use client'

import { Check, Mail, Printer, Send, X } from 'lucide-react'
import Link from 'next/link'
import { useActionState } from 'react'
import type { QuoteStatus } from '@/generated/prisma/enums'
import { SubmitButton } from '@/components/admin/AdminUI'
import { useActionToast } from '@/components/ui/Toast'
import { AdminCard, StatusPill } from '@/components/admin/AdminPage'
import { buttonClasses } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/Form'
import { quoteStatusLabels } from '@/lib/admin-labels'
import { initialAdminState } from '@/server/admin-state'
import { sendQuoteToCustomer, updateQuoteStatus } from '@/server/quote-actions'

/**
 * แผงจัดการใบเสนอราคาหลังจากออกเลขที่แล้ว
 *
 * แยกจากฟอร์มแก้ไขเนื้อหา เพราะเป็นคนละจังหวะของงาน:
 * ฟอร์มคือ "เอกสารจะเขียนว่าอะไร" ส่วนแผงนี้คือ "เอกสารเดินไปถึงไหนแล้ว"
 * เอาไว้ปนกันแล้วแอดมินต้องเลื่อนหาปุ่มส่งที่ก้นฟอร์มยาว ๆ ทุกครั้ง
 */

const tone: Record<QuoteStatus, 'muted' | 'accent' | 'success' | 'warning'> = {
  DRAFT: 'muted',
  SENT: 'accent',
  ACCEPTED: 'success',
  DECLINED: 'muted',
  EXPIRED: 'warning',
}

const dateTime = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

export function QuoteActions({
  id,
  status,
  customerEmail,
  sentAt,
  acceptedAt,
  isExpired,
  canSendMail,
}: {
  id: string
  status: QuoteStatus
  customerEmail: string
  sentAt: string | null
  acceptedAt: string | null
  /** ยังไม่ถูกตอบรับแต่เลยวันยืนราคาไปแล้ว */
  isExpired: boolean
  /** ตั้งค่า Resend ครบหรือยัง — ถ้ายัง ปุ่มส่งจะบอกสาเหตุแทนที่จะกดแล้วเงียบ */
  canSendMail: boolean
}) {
  const [state, sendAction] = useActionState(sendQuoteToCustomer, initialAdminState)

  useActionToast(state)

  const timeline = [
    sentAt && `ส่งให้ลูกค้าเมื่อ ${dateTime.format(new Date(sentAt))}`,
    acceptedAt && `ลูกค้าตอบรับเมื่อ ${dateTime.format(new Date(acceptedAt))}`,
  ].filter(Boolean) as string[]

  return (
    <AdminCard className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-medium">สถานะ</span>
          <StatusPill tone={isExpired ? 'warning' : tone[status]}>
            {isExpired ? 'เลยกำหนดยืนราคา' : quoteStatusLabels[status]}
          </StatusPill>
        </div>

        <Link
          href={`/admin/print/quote/${id}`}
          target="_blank"
          className={buttonClasses('outline', 'sm')}
        >
          <Printer size={15} strokeWidth={1.75} aria-hidden />
          พิมพ์ / บันทึกเป็น PDF
        </Link>
      </div>

      {timeline.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {timeline.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <form action={sendAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="accent" size="sm" pendingLabel="กำลังส่ง">
            <Send size={15} strokeWidth={1.75} aria-hidden />
            {status === 'DRAFT' ? 'ส่งให้ลูกค้าทางอีเมล' : 'ส่งอีเมลอีกครั้ง'}
          </SubmitButton>
        </form>

        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail size={13} strokeWidth={1.75} aria-hidden />
          {customerEmail || 'ยังไม่ได้กรอกอีเมลลูกค้า'}
        </span>
      </div>

      {!canSendMail && (
        <p className="mt-3 text-xs text-warning">
          ยังไม่ได้ตั้งค่าอีเมลขาออก (Resend) — ตอนนี้ส่งได้เฉพาะการพิมพ์เป็น PDF แล้วแนบส่งเอง
        </p>
      )}

      {state.message && (
        <div className="mt-3">
          <FormMessage status={state.status === 'error' ? 'error' : 'success'}>
            {state.message}
          </FormMessage>
        </div>
      )}

      {/*
        ปุ่มเลื่อนสถานะด้วยมือ สำหรับกรณีที่คุยกันจบทางโทรศัพท์หรือ LINE
        ไม่ได้เอาไปไว้ในฟอร์มแก้ไข เพราะการตอบรับไม่ควรต้องกดบันทึกทั้งเอกสารใหม่
      */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <span className="mr-1 text-xs text-muted-foreground">บันทึกผลด้วยตัวเอง</span>

        {status !== 'ACCEPTED' && (
          <form action={updateQuoteStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="ACCEPTED" />
            <SubmitButton variant="outline" size="sm" pendingLabel="กำลังบันทึก">
              <Check size={14} strokeWidth={2} aria-hidden />
              ลูกค้าตอบรับ
            </SubmitButton>
          </form>
        )}

        {status !== 'DECLINED' && (
          <form action={updateQuoteStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="DECLINED" />
            <SubmitButton variant="ghost" size="sm" pendingLabel="กำลังบันทึก">
              <X size={14} strokeWidth={2} aria-hidden />
              ลูกค้าปฏิเสธ
            </SubmitButton>
          </form>
        )}

        {status !== 'DRAFT' && (
          <form action={updateQuoteStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="DRAFT" />
            <SubmitButton variant="ghost" size="sm" pendingLabel="กำลังบันทึก">
              กลับเป็นฉบับร่าง
            </SubmitButton>
          </form>
        )}
      </div>
    </AdminCard>
  )
}
