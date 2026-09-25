import type { Metadata } from 'next'
import { AdminPageHeader } from '@/components/admin/AdminPage'
import { QuoteForm, type QuoteLineRow } from '@/components/admin/QuoteForm'
import { bangkokDateString } from '@/lib/bangkok-time'
import { toNumber } from '@/lib/format'
import {
  defaultWithholdingRate,
  packageQuoteLine,
  rentalQuoteLines,
  rentalQuoteNotes,
  rentalQuoteTerms,
} from '@/lib/rental-quote'
import { productQuoteLine } from '@/lib/product-pricing'
import { rentalEstimateTotals } from '@/lib/rental-pricing'
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
  const validDays = Number(quoteDefaults.defaultValidDays ?? 30)
  const validUntil = defaultValidUntil(validDays)
  const serviceWithholding = Number(quoteDefaults.defaultWithholdingRate ?? 3)

  /**
   * ลูกค้าที่ติดต่อมาเป็นภาษาอังกฤษต้องได้เอกสารภาษาอังกฤษทั้งใบ
   * ของเดิมหยิบ termsTh มาเสมอ ทำให้เอกสารภาษาอังกฤษมีเงื่อนไขเป็นภาษาไทยปนอยู่ท้ายใบ
   */
  const locale = lead?.locale === 'en' ? 'en' : 'th'
  const isEnglish = locale === 'en'
  const isRental = Boolean(lead?.items.length)

  // มาจากคำขอเช่าอุปกรณ์: ตั้งรายการจากอุปกรณ์ จำนวนวัน และเรตค่าเช่าในระบบ
  const rentalItems = (lead?.items ?? []).map((item) => ({
    label: item.labelSnapshot,
    quantity: item.quantity,
    days: item.days,
    dailyRate: toNumber(item.equipment?.dailyRate),
    weeklyRate: toNumber(item.equipment?.weeklyRate),
  }))

  const items: QuoteLineRow[] = isRental
    ? rentalQuoteLines(rentalItems, { locale })
    : lead?.package
      ? [
          packageQuoteLine({
            locale,
            serviceName: isEnglish ? lead.package.service.titleEn : lead.package.service.titleTh,
            packageName: isEnglish ? lead.package.nameEn : lead.package.nameTh,
            priceFrom: toNumber(lead.package.priceFrom),
            priceUnit: lead.package.priceUnit,
          }),
        ]
      : lead?.product
        ? [
            productQuoteLine({
              locale,
              productName: isEnglish ? lead.product.nameEn : lead.product.nameTh,
              planName: lead.productPlan ? (isEnglish ? lead.productPlan.nameEn : lead.productPlan.nameTh) : null,
              plan: lead.productPlan,
            }),
          ]
        : []

  const deposit = rentalEstimateTotals({
    amounts: [],
    deposits: (lead?.items ?? []).map(
      (item) => (toNumber(item.equipment?.depositAmount) ?? 0) * Math.max(1, item.quantity),
    ),
    vatRate: 0,
    hasOnRequest: false,
  }).deposit

  const notes = isRental
    ? rentalQuoteNotes({
        locale,
        startDate: lead?.preferredDate ? bangkokDateString(lead.preferredDate) : null,
        days: lead?.items[0]?.days ?? null,
        deposit,
      })
    : ''

  const terms = isRental
    ? rentalQuoteTerms(locale, validDays)
    : isEnglish
      ? String(quoteDefaults.termsEn ?? quoteDefaults.termsTh ?? '')
      : String(quoteDefaults.termsTh ?? '')

  // ซื้อสินค้าที่จับต้องได้ไม่ใช่ค่าบริการหรือค่าสิทธิ์ ผู้ซื้อไม่ต้องหัก ณ ที่จ่าย
  const isGoods = lead?.product?.type === 'PHYSICAL'
  const withholdingRate = lead
    ? isGoods
      ? 0
      : defaultWithholdingRate({ isRental, hasCompany: Boolean(lead.company), serviceRate: serviceWithholding })
    : serviceWithholding

  // สิ่งที่ระบบเดาแทนให้ ต้องบอกให้เห็นก่อนบันทึก ไม่ใช่ปล่อยให้ไปรู้ทีหลังจากลูกค้า
  const checks = [
    isRental && lead?.items.some((item) => item.days === null) && 'ลูกค้าไม่ได้ระบุจำนวนวัน รายการตั้งไว้ 1 วัน',
    rentalItems.some((item) => item.dailyRate === null) && 'บางชิ้นยังไม่ได้ตั้งเรตค่าเช่า ต้องใส่ราคาเอง',
    lead &&
      !lead.company &&
      'ลูกค้าไม่ได้กรอกชื่อบริษัท หัก ณ ที่จ่ายจึงตั้งไว้ 0% (บุคคลธรรมดาไม่ต้องหัก)',
    lead?.company && isRental && 'ลูกค้ามีบริษัท หัก ณ ที่จ่ายค่าเช่าตั้งไว้ 5%',
    lead?.product && !lead.productPlan && 'ลูกค้าไม่ได้เลือกแพ็กเกจ ต้องใส่ราคาเอง',
    isGoods && 'สินค้าที่จับต้องได้ หัก ณ ที่จ่ายตั้งไว้ 0% ตรวจกับฝ่ายบัญชีถ้ามีค่าติดตั้งหรือบริการรวมอยู่',
    lead?.product && !isGoods && lead.company && 'ผลิตภัณฑ์ใช้อัตราหัก ณ ที่จ่ายของงานบริการ ตรวจกับฝ่ายบัญชีว่าเข้าเกณฑ์ค่าสิทธิ์หรือไม่',
  ].filter(Boolean) as string[]

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title="สร้างใบเสนอราคา"
        description={
          lead
            ? `ดึงข้อมูลลูกค้า${isRental ? ' อุปกรณ์ และเรตค่าเช่า' : lead.package ? ' และแพ็กเกจ' : lead.product ? ' และผลิตภัณฑ์' : ''}จากคำขอ ${lead.refCode} มาให้แล้ว ตรวจก่อนบันทึก`
            : 'เลขที่เอกสารจะถูกออกให้อัตโนมัติเมื่อกดบันทึก'
        }
      />

      {checks.length > 0 && (
        <ul className="mb-6 space-y-1 rounded-md border border-border bg-subtle px-4 py-3 text-sm text-muted-foreground">
          {checks.map((check) => (
            <li key={check}>· {check}</li>
          ))}
        </ul>
      )}

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
          locale,
          validUntil,
          discount: '0',
          vatRate: String(quoteDefaults.defaultVatRate ?? 7),
          withholdingRate: String(withholdingRate),
          notes,
          termsText: terms,
          items,
        }}
      />
    </div>
  )
}
