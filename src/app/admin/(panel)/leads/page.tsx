import { Paperclip, StickyNote } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LeadStatus } from '@/generated/prisma/enums'
import {
  budgetLabels,
  leadSourceLabels,
  leadStatusLabels,
  leadStatusTone,
  serviceCategoryLabels,
} from '@/lib/admin-labels'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getLeads } from '@/server/admin-queries'

export const metadata: Metadata = { title: 'คำขอลูกค้า' }

const statuses = Object.values(LeadStatus)

function parseStatus(value: string | undefined): LeadStatus | undefined {
  return statuses.find((s) => s === value)
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const active = parseStatus(status)
  const { leads, counts, total } = await getLeads(active)

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-4xl">คำขอลูกค้า</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ทุกคำขอจากฟอร์มบนเว็บไซต์ถูกบันทึกไว้ที่นี่พร้อมรหัสอ้างอิง
        </p>
      </header>

      <nav aria-label="กรองตามสถานะ" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/admin/leads"
              aria-current={!active ? 'true' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors',
                !active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-input text-muted-foreground hover:border-foreground/25 hover:text-foreground',
              )}
            >
              ทั้งหมด
              <span className="tabular text-xs opacity-60">{total}</span>
            </Link>
          </li>
          {statuses.map((s) => (
            <li key={s}>
              <Link
                href={`/admin/leads?status=${s}`}
                aria-current={active === s ? 'true' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors',
                  active === s
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-input text-muted-foreground hover:border-foreground/25 hover:text-foreground',
                )}
              >
                {leadStatusLabels[s]}
                <span className="tabular text-xs opacity-60">{counts[s] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {leads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          ยังไม่มีคำขอในสถานะนี้
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {leads.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/admin/leads/${lead.id}`}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{lead.name}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        leadStatusTone[lead.status],
                      )}
                    >
                      {leadStatusLabels[lead.status]}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    <span className="tabular font-medium">{lead.refCode}</span>
                    {lead.company && ` · ${lead.company}`}
                    {` · ${leadSourceLabels[lead.source]}`}
                    {lead.budgetRange && ` · ${budgetLabels[lead.budgetRange] ?? lead.budgetRange}`}
                    {lead.preferredDate && ` · ใช้งาน ${formatDate(lead.preferredDate, 'th')}`}
                  </p>

                  {lead.items.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      {lead.items.map((item, index) => (
                        <span
                          key={`${item.labelSnapshot}-${index}`}
                          className="rounded bg-accent-subtle px-1.5 py-0.5 text-[0.7rem] text-accent"
                        >
                          {item.labelSnapshot}
                        </span>
                      ))}
                      {lead._count.items > lead.items.length && (
                        <span className="px-1 py-0.5 text-[0.7rem] text-muted-foreground">
                          +{lead._count.items - lead.items.length}
                        </span>
                      )}
                    </p>
                  )}

                  {lead.services.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      {lead.services.map((service) => (
                        <span
                          key={service}
                          className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem] text-muted-foreground"
                        >
                          {serviceCategoryLabels[service]}
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                  {lead._count.items > 0 && (
                    <span className="inline-flex items-center gap-1" title="อุปกรณ์ที่สนใจ">
                      <Paperclip size={13} aria-hidden />
                      {lead._count.items}
                    </span>
                  )}
                  {lead._count.notes > 0 && (
                    <span className="inline-flex items-center gap-1" title="โน้ตภายใน">
                      <StickyNote size={13} aria-hidden />
                      {lead._count.notes}
                    </span>
                  )}
                  <span>{formatDate(lead.createdAt, 'th')}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
