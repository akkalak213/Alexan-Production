import { bahtText } from './baht-text'
import { escapeHtml } from './mail'

/**
 * อีเมลใบเสนอราคาที่ส่งให้ลูกค้า
 *
 * เขียนรายการทั้งใบลงในตัวอีเมลเลย ไม่ได้ส่งแค่ลิงก์
 * เพราะลูกค้าองค์กรมักส่งต่อเมลนี้ให้ฝ่ายจัดซื้อพิจารณา คนที่เปิดอ่านต่อจึงควรเห็นตัวเลขครบ
 * โดยไม่ต้องกดออกไปหน้าอื่นหรือขอสิทธิ์เข้าถึงอะไรเพิ่ม
 *
 * ใช้ table กับ inline style ล้วน — โปรแกรมอ่านเมลส่วนใหญ่ยังตัด <style> ทิ้งและไม่รองรับ flex
 */

export type QuoteEmailLine = {
  description: string
  quantity: number
  unit: string | null
  amount: number
}

export type QuoteEmailData = {
  quoteNumber: string
  customerName: string
  locale: string
  issueDate: Date
  validUntil: Date
  lines: QuoteEmailLine[]
  subtotal: number
  discount: number
  vatRate: number
  vatAmount: number
  withholdingRate: number
  withholdingAmount: number
  total: number
  notes: string | null
  terms: string | null
  companyName: string
  companyPhone: string
  companyEmail: string
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
}

const money = (value: number) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

const cell = 'padding:8px 0;border-bottom:1px solid #e8e6e1;font-size:14px;color:#16150f'
const label = 'padding:4px 16px 4px 0;color:#6b675c;font-size:13px'

export function quoteEmail(data: QuoteEmailData) {
  const isEnglish = data.locale === 'en'

  const t = isEnglish
    ? {
        subject: `Quotation ${data.quoteNumber} from ${data.companyName}`,
        greeting: `Dear ${data.customerName},`,
        intro: 'Thank you for your interest. Please find our quotation below.',
        number: 'Quotation no.',
        issued: 'Issue date',
        validUntil: 'Valid until',
        description: 'Description',
        qty: 'Qty',
        amount: 'Amount',
        subtotal: 'Subtotal',
        discount: 'Discount',
        vat: 'VAT',
        withholding: 'Withholding tax',
        total: 'Total due',
        notes: 'Notes',
        terms: 'Terms and conditions',
        payment: 'Payment details',
        closing: 'Reply to this email if anything needs adjusting — we are happy to revise it.',
      }
    : {
        subject: `ใบเสนอราคา ${data.quoteNumber} จาก ${data.companyName}`,
        greeting: `เรียน คุณ${data.customerName}`,
        intro: 'ขอบคุณที่สนใจบริการของเรา รายละเอียดใบเสนอราคาตามด้านล่างนี้ครับ',
        number: 'เลขที่',
        issued: 'วันที่',
        validUntil: 'ยืนราคาถึง',
        description: 'รายละเอียด',
        qty: 'จำนวน',
        amount: 'จำนวนเงิน',
        subtotal: 'รวมเป็นเงิน',
        discount: 'หักส่วนลด',
        vat: 'ภาษีมูลค่าเพิ่ม',
        withholding: 'หักภาษี ณ ที่จ่าย',
        total: 'ยอดชำระสุทธิ',
        notes: 'หมายเหตุ',
        terms: 'เงื่อนไข',
        payment: 'ข้อมูลการชำระเงิน',
        closing: 'หากต้องการปรับรายการหรือขอบเขตงาน ตอบกลับอีเมลฉบับนี้ได้เลยครับ ยินดีแก้ไขให้',
      }

  const dateFormat = new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })

  const meta = [
    [t.number, data.quoteNumber],
    [t.issued, dateFormat.format(data.issueDate)],
    [t.validUntil, dateFormat.format(data.validUntil)],
  ]
    .map(
      ([key, value]) =>
        `<tr><td style="${label}">${escapeHtml(key)}</td><td style="padding:4px 0;font-size:13px;color:#16150f;font-weight:600">${escapeHtml(value)}</td></tr>`,
    )
    .join('')

  const lines = data.lines
    .map(
      (line) => `<tr>
        <td style="${cell};padding-right:16px">${escapeHtml(line.description).replace(/\n/g, '<br>')}</td>
        <td style="${cell};text-align:right;white-space:nowrap">${line.quantity.toLocaleString('th-TH')}${line.unit ? ` ${escapeHtml(line.unit)}` : ''}</td>
        <td style="${cell};text-align:right;white-space:nowrap">${money(line.amount)}</td>
      </tr>`,
    )
    .join('')

  const totalRow = (name: string, value: string, strong = false) =>
    `<tr>
      <td style="padding:4px 16px 4px 0;font-size:13px;color:${strong ? '#16150f' : '#6b675c'};${strong ? 'font-weight:700' : ''}">${escapeHtml(name)}</td>
      <td style="padding:4px 0;text-align:right;font-size:${strong ? '16px' : '13px'};color:#16150f;${strong ? 'font-weight:700' : ''};white-space:nowrap">${value}</td>
    </tr>`

  const totals = [
    totalRow(t.subtotal, money(data.subtotal)),
    data.discount > 0 ? totalRow(t.discount, `−${money(data.discount)}`) : '',
    totalRow(`${t.vat} ${data.vatRate}%`, money(data.vatAmount)),
    data.withholdingAmount > 0
      ? totalRow(`${t.withholding} ${data.withholdingRate}%`, `−${money(data.withholdingAmount)}`)
      : '',
    totalRow(t.total, `฿${money(data.total)}`, true),
  ].join('')

  const block = (heading: string, body: string) =>
    `<p style="margin:24px 0 6px;font-size:13px;font-weight:600;color:#16150f">${escapeHtml(heading)}</p>
     <p style="margin:0;font-size:13px;line-height:1.7;color:#4a463d">${body}</p>`

  const html = `<!doctype html><html><body style="margin:0;background:#fbfaf8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
    <div style="max-width:620px;margin:0 auto;padding:32px 24px">
      <p style="margin:0 0 24px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#c2632a">${escapeHtml(data.companyName)}</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#16150f">${escapeHtml(isEnglish ? 'Quotation' : 'ใบเสนอราคา')}</h1>

      <p style="margin:0 0 4px;font-size:14px;color:#16150f">${escapeHtml(t.greeting)}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4a463d">${escapeHtml(t.intro)}</p>

      <table style="border-collapse:collapse;margin-bottom:20px">${meta}</table>

      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:6px;border-bottom:2px solid #16150f;font-size:12px;color:#6b675c">${escapeHtml(t.description)}</th>
            <th style="text-align:right;padding-bottom:6px;border-bottom:2px solid #16150f;font-size:12px;color:#6b675c">${escapeHtml(t.qty)}</th>
            <th style="text-align:right;padding-bottom:6px;border-bottom:2px solid #16150f;font-size:12px;color:#6b675c">${escapeHtml(t.amount)}</th>
          </tr>
        </thead>
        <tbody>${lines}</tbody>
      </table>

      <table style="margin:16px 0 0 auto;border-collapse:collapse">${totals}</table>
      ${isEnglish ? '' : `<p style="margin:8px 0 0;text-align:right;font-size:12px;color:#6b675c">(${escapeHtml(bahtText(data.total))})</p>`}

      ${data.notes ? block(t.notes, escapeHtml(data.notes).replace(/\n/g, '<br>')) : ''}
      ${data.terms ? block(t.terms, escapeHtml(data.terms).replace(/\n/g, '<br>')) : ''}
      ${
        data.bankAccountNumber
          ? block(
              t.payment,
              [data.bankName, data.bankAccountName, data.bankAccountNumber]
                .filter(Boolean)
                .map(escapeHtml)
                .join('<br>'),
            )
          : ''
      }

      <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#4a463d">${escapeHtml(t.closing)}</p>
      <p style="margin:20px 0 0;font-size:13px;color:#6b675c">
        ${escapeHtml(data.companyName)}<br>
        ${[data.companyPhone, data.companyEmail].filter(Boolean).map(escapeHtml).join(' · ')}
      </p>
    </div>
  </body></html>`

  return { subject: t.subject, html }
}
