import { Quote } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { ServiceCategory } from '@/generated/prisma/enums'
import type { Locale } from '@/i18n/routing'
import { Badge } from '@/components/ui/Badge'
import { RatingStars } from '@/components/ui/RatingStars'
import { formatMonthYear } from '@/lib/format'
import { cn } from '@/lib/utils'

export type ReviewCardData = {
  id: string
  authorName: string
  authorRole: string | null
  content: string
  rating: number
  serviceCategory: ServiceCategory | null
  locale: string
  isPinned: boolean
  replyTh: string | null
  replyEn: string | null
  createdAt: Date
}

/** ตัวอักษรแรกของชื่อในวงกลมแทนรูป ข้ามสระหน้าของไทย (เ แ โ ใ ไ) ที่ยืนเดี่ยวแล้วอ่านไม่ออก */
function initialOf(name: string) {
  return Array.from(name.trim()).find((char) => !'เแโใไ'.includes(char))?.toUpperCase() ?? '?'
}

export async function ReviewCard({
  review,
  locale,
  className,
}: {
  review: ReviewCardData
  locale: Locale
  className?: string
}) {
  const [t, tCat] = await Promise.all([
    getTranslations('reviews'),
    getTranslations('serviceCategory'),
  ])

  const reply = locale === 'th' ? review.replyTh : review.replyEn

  return (
    <article
      className={cn(
        'review-card flex h-full flex-col rounded-2xl border border-border bg-surface p-6 md:p-7',
        className,
      )}
    >
      {/* เครื่องหมายคำพูดอยู่แถวของตัวเอง ไม่ซ้อนใต้ข้อความ เดิมซ้อนแล้วทับอักษรตัวแรกของรีวิว */}
      <div className="flex items-center justify-between gap-4">
        <Quote size={26} strokeWidth={0} aria-hidden className="review-card-mark rotate-180 fill-current" />
        <div className="flex items-center gap-2">
          {review.isPinned && (
            <Badge variant="accent" className="shrink-0">
              {t('pinned')}
            </Badge>
          )}
          <RatingStars
            rating={review.rating}
            label={t('starsOf', { rating: review.rating })}
          />
        </div>
      </div>

      {/* lang บอกเบราว์เซอร์ให้เลือกฟอนต์และตัดคำถูกภาษา แม้ผู้รีวิวเขียนคนละภาษากับหน้าเว็บ */}
      <p lang={review.locale} className="review-card-text mt-4 flex-1">
        {review.content}
      </p>

      <footer className="mt-6 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="review-card-avatar" aria-hidden>
              {initialOf(review.authorName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-medium">{review.authorName}</p>
              <p className="truncate text-[0.8125rem] text-muted-foreground">
                {review.authorRole || formatMonthYear(review.createdAt, locale)}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right text-[0.8125rem] leading-snug">
            {review.serviceCategory && <p className="text-accent">{tCat(review.serviceCategory)}</p>}
            {review.authorRole && (
              <p className="text-muted-foreground">{formatMonthYear(review.createdAt, locale)}</p>
            )}
          </div>
        </div>

        {reply && (
          <div className="mt-4 rounded-md bg-subtle p-4">
            <p className="mb-1.5 text-[0.8125rem] font-medium text-accent">{t('ownerReply')}</p>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{reply}</p>
          </div>
        )}
      </footer>
    </article>
  )
}
