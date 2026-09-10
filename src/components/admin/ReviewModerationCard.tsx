'use client'

import { Check, MessageSquareReply, Pin, X } from 'lucide-react'
import { useActionState, useState } from 'react'
import type { ReviewStatus, ServiceCategory } from '@/generated/prisma/enums'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Form'
import { RatingStars } from '@/components/ui/RatingStars'
import { useActionToast } from '@/components/ui/Toast'
import { serviceCategoryLabels } from '@/lib/admin-labels'
import { initialAdminState } from '@/server/admin-state'
import { moderateReview, replyToReview } from '@/server/admin-actions'

export type ModerationReview = {
  id: string
  authorName: string
  authorRole: string | null
  submitterEmail: string | null
  content: string
  rating: number
  serviceCategory: ServiceCategory | null
  locale: string
  status: ReviewStatus
  isPinned: boolean
  replyTh: string | null
  replyEn: string | null
  createdAt: string
}

export function ReviewModerationCard({ review }: { review: ModerationReview }) {
  const [moderationState, moderateAction, isModerating] = useActionState(
    moderateReview,
    initialAdminState,
  )
  const [replyState, replyAction, isReplying] = useActionState(replyToReview, initialAdminState)
  useActionToast(moderationState)
  useActionToast(replyState)
  const [showReply, setShowReply] = useState(Boolean(review.replyTh || review.replyEn))

  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {review.authorName}
            {review.isPinned && (
              <Badge variant="accent">
                <Pin size={11} className="mr-1" aria-hidden />
                ปักหมุด
              </Badge>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {review.authorRole || 'ไม่ระบุตำแหน่ง'}
            {review.submitterEmail && ` · ${review.submitterEmail}`}
          </p>
        </div>
        <div className="text-right">
          <RatingStars rating={review.rating} size={14} />
          <p className="mt-1 text-xs text-muted-foreground">{review.createdAt}</p>
        </div>
      </div>

      <p
        lang={review.locale}
        className="mt-4 whitespace-pre-line rounded-md bg-subtle p-4 text-sm leading-relaxed"
      >
        {review.content}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>ภาษา: {review.locale === 'th' ? 'ไทย' : 'อังกฤษ'}</span>
        {review.serviceCategory && (
          <>
            <span aria-hidden>·</span>
            <span>{serviceCategoryLabels[review.serviceCategory]}</span>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {review.status !== 'APPROVED' && (
          <form action={moderateAction} className="flex items-center gap-2">
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="status" value="APPROVED" />
            <Button type="submit" variant="accent" size="sm" disabled={isModerating}>
              <Check size={15} strokeWidth={2} aria-hidden />
              เผยแพร่
            </Button>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="isPinned" className="accent-[hsl(var(--accent))]" />
              ปักหมุด
            </label>
          </form>
        )}

        {review.status === 'APPROVED' && (
          <form action={moderateAction}>
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="status" value="PENDING" />
            <Button type="submit" variant="outline" size="sm" disabled={isModerating}>
              ถอนกลับไปรออนุมัติ
            </Button>
          </form>
        )}

        {review.status !== 'REJECTED' && (
          <form action={moderateAction}>
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="status" value="REJECTED" />
            <Button type="submit" variant="ghost" size="sm" disabled={isModerating}>
              <X size={15} strokeWidth={2} aria-hidden />
              ปฏิเสธ
            </Button>
          </form>
        )}

        <Button variant="ghost" size="sm" onClick={() => setShowReply((v) => !v)}>
          <MessageSquareReply size={15} strokeWidth={1.75} aria-hidden />
          {showReply ? 'ซ่อนคำตอบกลับ' : 'ตอบกลับ'}
        </Button>

        {moderationState.message && (
          <p
            role="status"
            className={`text-xs ${moderationState.status === 'error' ? 'text-destructive' : 'text-success'}`}
          >
            {moderationState.message}
          </p>
        )}
      </div>

      {showReply && (
        <form action={replyAction} className="mt-4 space-y-3 border-t border-border pt-4">
          <input type="hidden" name="reviewId" value={review.id} />
          <p className="text-xs text-muted-foreground">
            คำตอบกลับจะแสดงใต้รีวิวบนหน้าเว็บ กรอกภาษาไหนก็ได้ ภาษาที่เว้นว่างจะไม่แสดงในหน้านั้น
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor={`reply-th-${review.id}`} className="mb-1 block text-xs font-medium">
                ภาษาไทย
              </label>
              <Textarea
                id={`reply-th-${review.id}`}
                name="replyTh"
                defaultValue={review.replyTh ?? ''}
                maxLength={1000}
                className="min-h-24"
              />
            </div>
            <div>
              <label htmlFor={`reply-en-${review.id}`} className="mb-1 block text-xs font-medium">
                English
              </label>
              <Textarea
                id={`reply-en-${review.id}`}
                name="replyEn"
                defaultValue={review.replyEn ?? ''}
                maxLength={1000}
                className="min-h-24"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" variant="outline" disabled={isReplying}>
              {isReplying ? 'กำลังบันทึก' : 'บันทึกคำตอบกลับ'}
            </Button>
            {replyState.message && (
              <p
                role="status"
                className={`text-xs ${replyState.status === 'error' ? 'text-destructive' : 'text-success'}`}
              >
                {replyState.message}
              </p>
            )}
          </div>
        </form>
      )}
    </article>
  )
}
