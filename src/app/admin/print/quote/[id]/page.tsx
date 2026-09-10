import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { PrintButton } from '@/components/ui/PrintButton'
import { bahtText } from '@/lib/baht-text'
import { toNumber } from '@/lib/format'
import { getAdminSettings, getQuote } from '@/server/admin-queries'
import { getActiveUser } from '@/server/cms-helpers'

export const metadata: Metadata = {
  title: 'ใบเสนอราคา',
  robots: { index: false, follow: false },
}

const money = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const num = (value: unknown) => toNumber(value) ?? 0

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  /**
   * หน้านี้อยู่นอก (panel) จึงไม่ได้รับด่านของ layout นั้น
   * middleware กันให้อยู่ชั้นหนึ่ง แต่ใบเสนอราคามีชื่อ ที่อยู่ และยอดเงินของลูกค้าอยู่เต็มหน้า
   * จึงไม่ควรพึ่งด่านเดียว — ตรวจซ้ำตรงจุดที่ดึงข้อมูลจริงด้วย
   */
  if (!(await getActiveUser())) redirect('/admin/login')

  const [quote, settings] = await Promise.all([getQuote(id), getAdminSettings()])
  if (!quote) notFound()

  const company = (settings.company ?? {}) as Record<string, string>
  const bank = (settings.quote ?? {}) as Record<string, string>
  const isEnglish = quote.locale === 'en'

  const t = {
    title: isEnglish ? 'QUOTATION' : 'ใบเสนอราคา',
    number: isEnglish ? 'Quotation no.' : 'เลขที่',
    issueDate: isEnglish ? 'Issue date' : 'วันที่',
    validUntil: isEnglish ? 'Valid until' : 'ยืนราคาถึง',
    billTo: isEnglish ? 'Prepared for' : 'เรียน',
    taxId: isEnglish ? 'Tax ID' : 'เลขประจำตัวผู้เสียภาษี',
    no: isEnglish ? 'No.' : 'ลำดับ',
    description: isEnglish ? 'Description' : 'รายละเอียด',
    qty: isEnglish ? 'Qty' : 'จำนวน',
    unitPrice: isEnglish ? 'Unit price' : 'ราคา/หน่วย',
    amount: isEnglish ? 'Amount' : 'จำนวนเงิน',
    subtotal: isEnglish ? 'Subtotal' : 'รวมเป็นเงิน',
    discount: isEnglish ? 'Discount' : 'หักส่วนลด',
    beforeTax: isEnglish ? 'Before tax' : 'ยอดก่อนภาษี',
    vat: isEnglish ? 'VAT' : 'ภาษีมูลค่าเพิ่ม',
    withholding: isEnglish ? 'Withholding tax' : 'หักภาษี ณ ที่จ่าย',
    total: isEnglish ? 'Total due' : 'ยอดชำระสุทธิ',
    notes: isEnglish ? 'Notes' : 'หมายเหตุ',
    terms: isEnglish ? 'Terms and conditions' : 'เงื่อนไข',
    payment: isEnglish ? 'Payment details' : 'ข้อมูลการชำระเงิน',
    preparedBy: isEnglish ? 'Prepared by' : 'ผู้เสนอราคา',
    acceptedBy: isEnglish ? 'Accepted by' : 'ผู้อนุมัติสั่งซื้อ',
    date: isEnglish ? 'Date' : 'วันที่',
  }

  const dateFormat = new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'th-TH', { dateStyle: 'long' })
  const terms = (quote.termsText ?? '').split('\n').filter(Boolean)

  return (
    <div className="min-h-dvh bg-muted/40 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-6 no-print">
        <Link
          href={`/admin/quotes/${quote.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          กลับไปแก้ไข
        </Link>
        <PrintButton label="พิมพ์ / บันทึกเป็น PDF" />
      </div>

      {/* กระดาษ A4 — ระยะขอบและขนาดตัวอักษรตั้งเป็นหน่วยมิลลิเมตร/พอยต์ ให้พิมพ์ออกมาตรงกับที่เห็น */}
      <article className="mx-auto w-[210mm] max-w-full bg-white p-[15mm] text-[10pt] leading-relaxed text-black shadow-lift print:w-auto print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b-2 border-black pb-5">
          <div className="flex gap-4">
            {/*
              โลโก้บนหัวเอกสาร — สั่งพิมพ์ด้วย print-color-adjust ไม่งั้นเบราว์เซอร์
              จะตัดพื้นหลังทึบทิ้งตอนพิมพ์ตามค่าเริ่มต้น แล้วเหลือแต่วงกลมขาว
            */}
            <Image
              src="/logo.png"
              alt=""
              width={512}
              height={512}
              className="h-[20mm] w-[20mm] shrink-0 [print-color-adjust:exact]"
              unoptimized
            />
            <div>
              <p className="text-[15pt] font-bold leading-tight">
                {(isEnglish
                  ? company.nameEn || company.nameTh
                  : company.legalNameTh || company.nameTh) || 'Alexan Production'}
              </p>
              {company.addressTh && (
                <p className="mt-1.5 max-w-[80mm] text-[8.5pt] leading-snug text-neutral-600">
                  {isEnglish ? company.addressEn || company.addressTh : company.addressTh}
                </p>
              )}
              <p className="mt-1 text-[8.5pt] text-neutral-600">
                {[company.phone, company.email].filter(Boolean).join(' · ')}
              </p>
              {company.taxId && (
                <p className="text-[8.5pt] text-neutral-600">
                  {t.taxId} {company.taxId}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[17pt] font-bold tracking-wide">{t.title}</p>
            <table className="mt-2 ml-auto text-[9pt]">
              <tbody>
                <tr>
                  <td className="pr-3 text-neutral-600">{t.number}</td>
                  <td className="font-semibold">{quote.quoteNumber}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-neutral-600">{t.issueDate}</td>
                  <td>{dateFormat.format(quote.issueDate)}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-neutral-600">{t.validUntil}</td>
                  <td>{dateFormat.format(quote.validUntil)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </header>

        <section className="mt-5">
          <p className="text-[8.5pt] uppercase tracking-wider text-neutral-500">{t.billTo}</p>
          <p className="mt-1 font-semibold">
            {quote.customerCompany || quote.customerName}
          </p>
          {quote.customerCompany && <p className="text-[9pt]">{quote.customerName}</p>}
          {quote.customerAddress && (
            <p className="mt-1 max-w-[110mm] whitespace-pre-line text-[9pt] leading-snug text-neutral-700">
              {quote.customerAddress}
            </p>
          )}
          <p className="mt-1 text-[9pt] text-neutral-700">
            {[quote.customerPhone, quote.customerEmail].filter(Boolean).join(' · ')}
          </p>
          {quote.customerTaxId && (
            <p className="text-[9pt] text-neutral-700">
              {t.taxId} {quote.customerTaxId}
            </p>
          )}
        </section>

        <table className="mt-6 w-full border-collapse text-[9.5pt]">
          <thead>
            <tr className="border-y border-black bg-neutral-100 print:bg-neutral-100">
              <th className="w-[12mm] py-2 pl-2 text-left font-semibold">{t.no}</th>
              <th className="py-2 text-left font-semibold">{t.description}</th>
              <th className="w-[22mm] py-2 text-right font-semibold">{t.qty}</th>
              <th className="w-[28mm] py-2 text-right font-semibold">{t.unitPrice}</th>
              <th className="w-[30mm] py-2 pr-2 text-right font-semibold">{t.amount}</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={item.id} className="border-b border-neutral-300 align-top">
                <td className="py-2.5 pl-2 tabular-nums">{index + 1}</td>
                <td className="whitespace-pre-line py-2.5 pr-4">{item.description}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {num(item.quantity).toLocaleString('th-TH')}
                  {item.unit && <span className="ml-1 text-neutral-500">{item.unit}</span>}
                </td>
                <td className="py-2.5 text-right tabular-nums">{money.format(num(item.unitPrice))}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{money.format(num(item.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex justify-end">
          <table className="w-[85mm] text-[9.5pt]">
            <tbody className="tabular-nums">
              <tr>
                <td className="py-1 text-neutral-600">{t.subtotal}</td>
                <td className="py-1 text-right">{money.format(num(quote.subtotal))}</td>
              </tr>
              {num(quote.discount) > 0 && (
                <tr>
                  <td className="py-1 text-neutral-600">{t.discount}</td>
                  <td className="py-1 text-right">−{money.format(num(quote.discount))}</td>
                </tr>
              )}
              <tr className="border-t border-neutral-300">
                <td className="py-1 text-neutral-600">{t.beforeTax}</td>
                <td className="py-1 text-right">
                  {money.format(num(quote.subtotal) - num(quote.discount))}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-neutral-600">
                  {t.vat} {num(quote.vatRate)}%
                </td>
                <td className="py-1 text-right">{money.format(num(quote.vatAmount))}</td>
              </tr>
              {num(quote.withholdingAmount) > 0 && (
                <tr>
                  <td className="py-1 text-neutral-600">
                    {t.withholding} {num(quote.withholdingRate)}%
                  </td>
                  <td className="py-1 text-right">−{money.format(num(quote.withholdingAmount))}</td>
                </tr>
              )}
              <tr className="border-t-2 border-black text-[11pt] font-bold">
                <td className="pt-2">{t.total}</td>
                <td className="pt-2 text-right">{money.format(num(quote.total))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {!isEnglish && (
          <p className="mt-3 border-y border-neutral-300 bg-neutral-50 py-2 text-center text-[9.5pt] print:bg-neutral-50">
            ({bahtText(num(quote.total))})
          </p>
        )}

        {quote.notes && (
          <section className="mt-5">
            <p className="text-[9pt] font-semibold">{t.notes}</p>
            <p className="mt-1 whitespace-pre-line text-[9pt] text-neutral-700">{quote.notes}</p>
          </section>
        )}

        <div className="mt-5 grid grid-cols-2 gap-8">
          {terms.length > 0 && (
            <section>
              <p className="text-[9pt] font-semibold">{t.terms}</p>
              <ol className="mt-1 ml-4 list-decimal space-y-0.5 text-[8.5pt] text-neutral-700">
                {terms.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ol>
            </section>
          )}

          {bank.bankAccountNumber && (
            <section>
              <p className="text-[9pt] font-semibold">{t.payment}</p>
              <p className="mt-1 text-[8.5pt] leading-snug text-neutral-700">
                {bank.bankName}
                <br />
                {bank.bankAccountName}
                <br />
                <span className="tabular-nums">{bank.bankAccountNumber}</span>
              </p>
            </section>
          )}
        </div>

        <footer className="mt-14 grid grid-cols-2 gap-12 break-inside-avoid">
          {[t.preparedBy, t.acceptedBy].map((label) => (
            <div key={label}>
              <div className="h-12 border-b border-neutral-400" />
              <p className="mt-1.5 text-[9pt] text-neutral-600">{label}</p>
              <p className="mt-4 text-[9pt] text-neutral-600">
                {t.date} ............................................
              </p>
            </div>
          ))}
        </footer>
      </article>
    </div>
  )
}
