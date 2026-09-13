import type { Metadata } from 'next'
import { AdminPageHeader } from '@/components/admin/AdminPage'
import { QuoteForm, type QuoteLineRow } from '@/components/admin/QuoteForm'
import { getAdminSettings, getLeadForQuote } from '@/server/admin-queries'
import { defaultValidUntil } from '@/server/cms-helpers'

export const metadata: Metadata = { title: 'สร้างใบเสนอราคา' }

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>
}) {
  const { leadId } = await searchParams
  const [settings, lead] = await Promise.all([
    getAdminSettings(),
    leadId ? getLeadForQuote(leadId) : null,
  ])

  const quoteDefaults = settings.quote ?? {}
  const validUntil = defaultValidUntil(Number(quoteDefaults.defaultValidDays ?? 30))

  /**
   * ลูกค้าที่ติดต่อมาเป็นภาษาอังกฤษต้องได้เงื่อนไขภาษาอังกฤษ
   * ของเดิมหยิบ termsTh มาเสมอ ทำให้เอกสารภาษาอังกฤษมีเงื่อนไขเป็นภาษาไทยปนอยู่ท้ายใบ
   */
  const isEnglish = lead?.locale === 'en'
  const defaultTerms = isEnglish
    ? String(quoteDefaults.termsEn ?? quoteDefaults.termsTh ?? '')
    : String(quoteDefaults.termsTh ?? '')

  // มาจากคำขอเช่าอุปกรณ์ ให้ตั้งรายการตั้งต้นจากอุปกรณ์ที่ลูกค้าเลือกไว้
  const items: QuoteLineRow[] =
    lead?.items.map((item) => ({
      description: item.labelSnapshot,
      quantity: String(item.days ?? item.quantity ?? 1),
      unit: item.days ? 'วัน' : 'ชิ้น',
      unitPrice: '',
    })) ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title="สร้างใบเสนอราคา"
        description={
          lead
            ? `ดึงข้อมูลลูกค้าจากคำขอ ${lead.refCode} มาให้แล้ว`
            : 'เลขที่เอกสารจะถูกออกให้อัตโนมัติเมื่อกดบันทึก'
        }
      />
      <QuoteForm
        quote={{
          id: '',
          leadId: lead?.id ?? '',
          leadRefCode: lead?.refCode ?? '',
          quoteNumber: '',
          version: '',
          customerName: lead?.name ?? '',
          customerCompany: lead?.company ?? '',
          customerAddress: '',
          customerTaxId: '',
          customerEmail: lead?.email ?? '',
          customerPhone: lead?.phone ?? '',
          locale: lead?.locale ?? 'th',
          validUntil,
          discount: '0',
          vatRate: String(quoteDefaults.defaultVatRate ?? 7),
          withholdingRate: String(quoteDefaults.defaultWithholdingRate ?? 3),
          notes: '',
          termsText: defaultTerms,
          status: 'DRAFT',
          items,
        }}
      />
    </div>
  )
}
