import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminPageHeader, EmptyState, StatusPill } from '@/components/admin/AdminPage'
import { ConfirmSubmitButton } from '@/components/admin/AdminUI'
import { quoteStatusLabels } from '@/lib/admin-labels'
import { formatDate, formatPrice } from '@/lib/format'
import { getQuotes } from '@/server/admin-queries'
import { deleteQuote } from '@/server/quote-actions'

export const metadata: Metadata = { title: 'ใบเสนอราคา' }

const tone = {
  DRAFT: 'muted',
  SENT: 'accent',
  ACCEPTED: 'success',
  DECLINED: 'muted',
  EXPIRED: 'warning',
} as const

export default async function AdminQuotesPage() {
  const quotes = await getQuotes()
  const now = new Date()

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="ใบเสนอราคา"
        description="ออกใบเสนอราคาพร้อม VAT และภาษีหัก ณ ที่จ่าย สั่งพิมพ์เป็น PDF ได้จากหน้ารายละเอียด"
        action={{ href: '/admin/quotes/new', label: 'สร้างใบเสนอราคา' }}
      />

      {quotes.length === 0 ? (
        <EmptyState>ยังไม่มีใบเสนอราคา สร้างจากคำขอลูกค้าได้เลย</EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {quotes.map((quote) => {
            const isExpired = quote.status === 'SENT' && quote.validUntil < now
            return (
              <li
                key={quote.id}
                className="flex flex-wrap items-center gap-x-2 pr-3 transition-colors hover:bg-muted/40"
              >
                <Link
                  href={`/admin/quotes/${quote.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="tabular text-sm font-medium text-accent">
                        {quote.quoteNumber}
                      </span>
                      <span className="truncate">{quote.customerName}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {quote.customerCompany && `${quote.customerCompany} · `}
                      ออกเมื่อ {formatDate(quote.issueDate, 'th')} · ยืนราคาถึง{' '}
                      {formatDate(quote.validUntil, 'th')}
                      {quote.lead && ` · ${quote.lead.refCode}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular text-sm font-medium">
                      {formatPrice(quote.total, 'th')}
                    </span>
                    <StatusPill tone={isExpired ? 'warning' : tone[quote.status]}>
                      {isExpired ? 'เลยกำหนดยืนราคา' : quoteStatusLabels[quote.status]}
                    </StatusPill>
                  </div>
                </Link>

                {/* ลบจากรายการได้เลย ไม่ต้องเปิดใบแล้วเลื่อนลงไปหาปุ่มท้ายฟอร์ม */}
                <form action={deleteQuote} className="pb-3 pl-4 sm:pb-0 sm:pl-0">
                  <input type="hidden" name="id" value={quote.id} />
                  <ConfirmSubmitButton variant="ghost" size="sm" question={`ลบ ${quote.quoteNumber} ถาวร`}>
                    ลบ
                  </ConfirmSubmitButton>
                </form>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
