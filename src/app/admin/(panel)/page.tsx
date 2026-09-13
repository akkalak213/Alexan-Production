import { ArrowUpRight, Inbox, ReceiptText, Star, Camera } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { RatingStars } from '@/components/ui/RatingStars'
import type { TaskTone } from '@/lib/admin-tasks'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getDashboardData } from '@/server/admin-queries'

const taskTone: Record<TaskTone, string> = {
  urgent: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-muted-foreground/40',
}

export const metadata: Metadata = { title: 'แดชบอร์ด' }

const leadStatusLabels: Record<string, string> = {
  NEW: 'ใหม่',
  CONTACTED: 'ติดต่อแล้ว',
  QUOTED: 'เสนอราคาแล้ว',
  WON: 'ปิดการขาย',
  LOST: 'ไม่สำเร็จ',
}

const sourceLabels: Record<string, string> = {
  CONTACT: 'ฟอร์มติดต่อ',
  QUOTE: 'ขอใบเสนอราคา',
  RENTAL: 'เช่าอุปกรณ์',
  SERVICE_PAGE: 'หน้าบริการ',
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData()

  const stats = [
    {
      label: 'คำขอที่ยังไม่ได้ตอบ',
      value: data.leads.new,
      sub: `เดือนนี้ทั้งหมด ${data.leads.thisMonth} คำขอ`,
      href: '/admin/leads',
      icon: Inbox,
      urgent: data.leads.new > 0,
    },
    {
      label: 'รีวิวรออนุมัติ',
      value: data.reviews.pending,
      sub: `เผยแพร่แล้ว ${data.reviews.approved} รีวิว`,
      href: '/admin/reviews',
      icon: Star,
      urgent: data.reviews.pending > 0,
    },
    {
      label: 'ผลงานที่เผยแพร่',
      value: data.projects.published,
      sub: data.projects.draft > 0 ? `ฉบับร่างอีก ${data.projects.draft} ชิ้น` : 'ไม่มีฉบับร่างค้าง',
      href: '/admin/projects',
      icon: Camera,
      urgent: false,
    },
    {
      label: 'ใบเสนอราคาที่ส่งแล้ว',
      value: data.quotes.sent,
      sub: data.quotes.draft > 0 ? `ฉบับร่างอีก ${data.quotes.draft} ใบ` : 'ไม่มีฉบับร่างค้าง',
      href: '/admin/quotes',
      icon: ReceiptText,
      urgent: false,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="font-display text-4xl">แดชบอร์ด</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ภาพรวมงานที่ต้องจัดการวันนี้
        </p>
      </header>

      {/* เรียงตามความเร่ง ไม่ใช่ตามประเภท — สิ่งแรกที่เห็นคือสิ่งที่ควรทำก่อน */}
      <section aria-labelledby="tasks-title" className="mb-8 rounded-lg border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="tasks-title" className="font-medium">
            สิ่งที่ควรทำตอนนี้
          </h2>
          {data.tasks.length > 0 && (
            <span className="text-xs text-muted-foreground">{data.tasks.length} เรื่อง</span>
          )}
        </header>

        {data.tasks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">ไม่มีงานค้าง ทุกอย่างเรียบร้อย</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <span aria-hidden className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', taskTone[task.tone])} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{task.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">{task.detail}</span>
                  </span>
                  <span className="tabular shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {task.count}
                  </span>
                  <ArrowUpRight
                    size={15}
                    strokeWidth={2}
                    aria-hidden
                    className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link
              href={stat.href}
              className="group flex h-full flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent/40"
            >
              <div className="flex items-start justify-between">
                <stat.icon
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden
                  className={stat.urgent ? 'text-accent' : 'text-muted-foreground'}
                />
                <ArrowUpRight
                  size={15}
                  strokeWidth={2}
                  aria-hidden
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="tabular mt-4 font-display text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm font-medium">{stat.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-medium">คำขอล่าสุด</h2>
            <Link href="/admin/leads" className="text-sm text-accent hover:underline">
              ดูทั้งหมด
            </Link>
          </header>

          {data.recentLeads.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              ยังไม่มีคำขอเข้ามา
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentLeads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{lead.name}</span>
                        {lead.status === 'NEW' && (
                          <Badge variant="accent" className="shrink-0">
                            ใหม่
                          </Badge>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className="tabular">{lead.refCode}</span>
                        {lead.company && ` · ${lead.company}`}
                        {` · ${sourceLabels[lead.source] ?? lead.source}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(lead.createdAt, 'th')}
                      </p>
                      <p className="mt-0.5 text-xs">{leadStatusLabels[lead.status] ?? lead.status}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-medium">รีวิวรออนุมัติ</h2>
            <Link href="/admin/reviews" className="text-sm text-accent hover:underline">
              ดูทั้งหมด
            </Link>
          </header>

          {data.recentReviews.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">ไม่มีรีวิวค้างอนุมัติ</p>
              <p className="mt-1 text-xs text-muted-foreground">
                คะแนนเฉลี่ยตอนนี้ {data.reviews.average.toFixed(1)} จาก 5
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentReviews.map((review) => (
                <li key={review.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{review.authorName}</p>
                    <RatingStars rating={review.rating} size={13} />
                  </div>
                  {review.authorRole && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {review.authorRole}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {review.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
