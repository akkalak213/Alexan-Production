import { ArrowLeft, Building2, FileText, Mail, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LeadNoteForm } from '@/components/admin/LeadNoteForm'
import { buttonClasses } from '@/components/ui/Button'
import { LeadStatusForm } from '@/components/admin/LeadStatusForm'
import {
  budgetLabels,
  leadSourceLabels,
  quoteStatusLabels,
  serviceCategoryLabels,
} from '@/lib/admin-labels'
import { bangkokDateString } from '@/lib/bangkok-time'
import { formatPrice, toNumber } from '@/lib/format'
import { rentalEndDate, rentalRequestEstimate } from '@/lib/rental-request'
import { getLeadById } from '@/server/admin-queries'

export const metadata: Metadata = { title: 'รายละเอียดคำขอ' }

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lead = await getLeadById(id)
  if (!lead) notFound()

  const dateTime = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium',
    timeStyle: 'short',
  })
  const dateOnly = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', dateStyle: 'medium' })
  const showDate = (iso: string) => dateOnly.format(new Date(`${iso}T00:00:00Z`))

  // ลูกค้าเลือกจำนวนวันจากฟอร์มเดียว ทุกรายการจึงเก็บค่าเดียวกัน
  const rentalDays = lead.items.find((item) => item.days)?.days ?? null
  const startDate = lead.preferredDate ? bangkokDateString(lead.preferredDate) : null
  const rentalPeriod = startDate
    ? `${showDate(startDate)} – ${showDate(rentalEndDate(startDate, rentalDays ?? 1))}`
    : null

  // คิดจากเรตปัจจุบัน ใช้ประเมินขนาดงานก่อนออกใบเสนอราคา ไม่ใช่ราคาที่ยืนยันกับลูกค้า
  const estimate = lead.items.length
    ? rentalRequestEstimate(
        lead.items.map((item) => ({
          id: item.id,
          label: item.labelSnapshot,
          dailyRate: toNumber(item.equipment?.dailyRate),
          weeklyRate: toNumber(item.equipment?.weeklyRate),
          deposit: toNumber(item.equipment?.depositAmount),
        })),
        rentalDays ?? 1,
      )
    : null
  const lineById = new Map(estimate?.lines.map((line) => [line.id, line]))

  // คำขอจากหน้าผลิตภัณฑ์ใช้ช่องแพ็กเกจเก็บชื่อกับราคาเหมือนกัน แต่ของที่ชี้กลับไปคือผลิตภัณฑ์ ไม่ใช่แพ็กเกจบริการ
  const isProductLead = lead.source === 'PRODUCT'
  const offerRemoved = isProductLead ? !lead.product : !lead.package

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/leads"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
        กลับไปรายการคำขอ
      </Link>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="tabular text-sm text-accent">{lead.refCode}</p>
          <h1 className="mt-1 font-display text-4xl">{lead.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ส่งเข้ามาเมื่อ {dateTime.format(lead.createdAt)} · ผ่าน{' '}
            {leadSourceLabels[lead.source]}
          </p>
        </div>
        <div className="w-56">
          <LeadStatusForm leadId={lead.id} current={lead.status} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* แพ็กเกจที่ลูกค้ากดเลือกเอง — ตัวชี้เจตนาที่ชัดที่สุดว่าเขาสนใจอะไรและรับราคาไหนได้ */}
          {lead.packageName && (
            <section className="rounded-lg border border-accent/40 bg-accent-subtle p-5">
              <h2 className="text-xs font-medium uppercase tracking-wider text-accent">
                {isProductLead ? 'ผลิตภัณฑ์ที่ลูกค้าสนใจ' : 'แพ็กเกจที่ลูกค้าเลือก'}
              </h2>
              <p className="mt-2 text-lg font-medium">
                {lead.package?.service?.titleTh && `${lead.package.service.titleTh} · `}
                {lead.packageName}
              </p>
              {lead.packagePriceTag && (
                <p className="tabular mt-1 text-sm text-muted-foreground">
                  ราคาที่ลูกค้าเห็นตอนกด: {lead.packagePriceTag}
                </p>
              )}
              {isProductLead && lead.product && (
                <a
                  href={`/products/${lead.product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-xs text-accent underline underline-offset-4 hover:no-underline"
                >
                  เปิดหน้าผลิตภัณฑ์ที่ลูกค้าเห็น
                </a>
              )}
              {offerRemoved && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {isProductLead ? 'ผลิตภัณฑ์' : 'แพ็กเกจ'}นี้ถูกลบออกจากระบบแล้ว ข้อมูลด้านบนเป็นค่าที่บันทึกไว้ตอนลูกค้าส่งคำขอ
                </p>
              )}
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 font-medium">ข้อความจากลูกค้า</h2>
            <p className="whitespace-pre-line rounded-md bg-subtle p-4 text-sm leading-relaxed">
              {lead.message || <span className="text-muted-foreground">ลูกค้าไม่ได้พิมพ์ข้อความ</span>}
            </p>
          </section>

          {lead.items.length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-5">
              <h2 className="mb-1 font-medium">อุปกรณ์ที่สนใจเช่า</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                {rentalPeriod && `ใช้งาน ${rentalPeriod} · `}
                {rentalDays ? `${rentalDays} วัน` : 'ลูกค้าไม่ได้ระบุจำนวนวัน ยอดด้านล่างคิดที่ 1 วัน'}
              </p>
              <ul className="space-y-2">
                {lead.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-subtle px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      {item.labelSnapshot}
                      <span className="tabular ml-2 text-xs text-muted-foreground">
                        {lineById.get(item.id)?.isOnRequest
                          ? 'ยังไม่ได้ตั้งเรต'
                          : formatPrice(lineById.get(item.id)?.amount, 'th')}
                      </span>
                    </span>
                    {item.equipment ? (
                      // ลิงก์ไปหน้าแก้ไขของชิ้นนั้นตรง ๆ
                      // ของเดิมส่ง ?highlight=<slug> ไปหน้ารายการซึ่งไม่มีโค้ดอ่านค่านั้นเลย
                      // กดแล้วจึงได้แค่รายการอุปกรณ์ทั้งหมด ต้องไปไล่หาเองอยู่ดี
                      <Link
                        href={`/admin/equipment/${item.equipment.id}`}
                        className="text-xs text-accent hover:underline"
                      >
                        ดูอุปกรณ์
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">อุปกรณ์ถูกลบแล้ว</span>
                    )}
                  </li>
                ))}
              </ul>
              {estimate && (
                <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">ค่าเช่าตามเรตปัจจุบัน (ก่อน VAT)</dt>
                    <dd className="tabular font-medium">{formatPrice(estimate.subtotal, 'th')}</dd>
                  </div>
                  {estimate.deposit > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">เงินมัดจำ</dt>
                      <dd className="tabular">{formatPrice(estimate.deposit, 'th')}</dd>
                    </div>
                  )}
                </dl>
              )}
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 font-medium">บันทึกภายใน</h2>
            <LeadNoteForm leadId={lead.id} />

            {lead.notes.length > 0 && (
              <ul className="mt-6 space-y-4 border-t border-border pt-5">
                {lead.notes.map((note) => (
                  <li key={note.id}>
                    <p className="whitespace-pre-line text-sm leading-relaxed">{note.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.author?.name ?? 'ทีมงาน'} · {dateTime.format(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 font-medium">ข้อมูลติดต่อ</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2.5">
                <Mail size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                <a href={`mailto:${lead.email}`} className="break-all hover:text-accent">
                  {lead.email}
                </a>
              </li>
              {lead.phone && (
                <li className="flex gap-2.5">
                  <Phone size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                  <a href={`tel:${lead.phone}`} className="hover:text-accent">
                    {lead.phone}
                  </a>
                </li>
              )}
              {lead.company && (
                <li className="flex gap-2.5">
                  <Building2 size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                  {lead.company}
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 font-medium">รายละเอียดคำขอ</h2>
            <dl className="space-y-3 text-sm">
              {lead.services.length > 0 && (
                <div>
                  <dt className="text-xs text-muted-foreground">บริการที่สนใจ</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {lead.services.map((service) => (
                      <span key={service} className="rounded bg-muted px-2 py-0.5 text-xs">
                        {serviceCategoryLabels[service]}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {rentalPeriod && (
                <div>
                  <dt className="text-xs text-muted-foreground">วันที่ใช้งาน</dt>
                  <dd className="mt-0.5">{rentalPeriod}</dd>
                </div>
              )}
              {rentalDays && (
                <div>
                  <dt className="text-xs text-muted-foreground">จำนวนวัน</dt>
                  <dd className="mt-0.5">{rentalDays} วัน</dd>
                </div>
              )}
              {lead.budgetRange && (
                <div>
                  <dt className="text-xs text-muted-foreground">งบประมาณ</dt>
                  <dd className="mt-0.5">{budgetLabels[lead.budgetRange] ?? lead.budgetRange}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">ภาษาที่ลูกค้าใช้</dt>
                <dd className="mt-0.5">{lead.locale === 'th' ? 'ไทย' : 'อังกฤษ'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 font-medium">ใบเสนอราคา</h2>
            {lead.quotes.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">ยังไม่ได้ออกใบเสนอราคาให้คำขอนี้</p>
            ) : (
              <ul className="space-y-2">
                {lead.quotes.map((quote) => (
                  <li key={quote.id}>
                    <Link
                      href={`/admin/quotes/${quote.id}`}
                      className="flex items-center justify-between gap-3 rounded-md bg-subtle px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span className="tabular">{quote.quoteNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {quoteStatusLabels[quote.status]} ·{' '}
                        {formatPrice(quote.total, 'th') ?? '—'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {/*
              ดึงชื่อ อีเมล เบอร์ และอุปกรณ์ที่ลูกค้าเลือกไว้ไปตั้งเป็นรายการตั้งต้นให้เลย
              ทีมขายจึงเหลือแค่ใส่ราคา ไม่ต้องพิมพ์ข้อมูลลูกค้าซ้ำจากหน้านี้
            */}
            <Link
              href={`/admin/quotes/new?leadId=${lead.id}`}
              className={buttonClasses('primary', 'sm', 'mt-4 w-full')}
            >
              <FileText size={15} strokeWidth={1.75} aria-hidden />
              {lead.quotes.length === 0 ? 'ออกใบเสนอราคา' : 'ออกใบเสนอราคาอีกฉบับ'}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
