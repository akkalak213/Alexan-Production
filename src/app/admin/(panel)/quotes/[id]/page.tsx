import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/AdminPage'
import { QuoteActions } from '@/components/admin/QuoteActions'
import { QuoteForm } from '@/components/admin/QuoteForm'
import { isMailConfigured } from '@/lib/env'
import { toNumber } from '@/lib/format'
import { getQuote } from '@/server/admin-queries'
import { versionOf } from '@/server/cms-helpers'

export const metadata: Metadata = { title: 'แก้ไขใบเสนอราคา' }

const asInput = (value: unknown) => {
  const n = toNumber(value)
  return n === null ? '' : String(n)
}

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quote = await getQuote(id)
  if (!quote) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title={quote.quoteNumber}
        description={
          quote.createdBy ? `ออกโดย ${quote.createdBy.name}` : undefined
        }
      />

      {quote.lead && (
        <p className="mb-6 text-sm text-muted-foreground">
          ออกจากคำขอ{' '}
          <Link href={`/admin/leads/${quote.lead.id}`} className="text-accent hover:underline">
            {quote.lead.refCode}
          </Link>
        </p>
      )}

      <QuoteActions
        id={quote.id}
        status={quote.status}
        customerEmail={quote.customerEmail}
        sentAt={quote.sentAt?.toISOString() ?? null}
        acceptedAt={quote.acceptedAt?.toISOString() ?? null}
        // เลยวันยืนราคาแล้วแต่ยังไม่มีคำตอบ — เตือนไว้ก่อนที่จะเผลอไปตามลูกค้าด้วยราคาเก่า
        isExpired={
          quote.validUntil < new Date() &&
          quote.status !== 'ACCEPTED' &&
          quote.status !== 'DECLINED'
        }
        canSendMail={isMailConfigured}
      />

      <QuoteForm
        quote={{
          id: quote.id,
          leadId: quote.leadId ?? '',
          leadRefCode: quote.lead?.refCode ?? '',
          quoteNumber: quote.quoteNumber,
          version: versionOf(quote.updatedAt),
          customerName: quote.customerName,
          customerCompany: quote.customerCompany ?? '',
          customerAddress: quote.customerAddress ?? '',
          customerTaxId: quote.customerTaxId ?? '',
          customerEmail: quote.customerEmail,
          customerPhone: quote.customerPhone ?? '',
          locale: quote.locale,
          validUntil: quote.validUntil.toISOString().slice(0, 10),
          discount: asInput(quote.discount),
          vatRate: asInput(quote.vatRate),
          withholdingRate: asInput(quote.withholdingRate),
          notes: quote.notes ?? '',
          termsText: quote.termsText ?? '',
          status: quote.status,
          items: quote.items.map((item) => ({
            description: item.description,
            quantity: asInput(item.quantity),
            unit: item.unit ?? '',
            unitPrice: asInput(item.unitPrice),
          })),
        }}
      />
    </div>
  )
}
