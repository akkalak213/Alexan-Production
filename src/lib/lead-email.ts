import { budgetLabels, leadSourceLabels, serviceCategoryLabels } from './admin-labels'
import { escapeHtml } from './email-html'
import { rentalEndDate } from './rental-request'

/**
 * อีเมลของคำขอจากหน้าเว็บ มีสองฉบับ
 *
 *   แจ้งทีม   — ป้ายภาษาไทยแทนรหัสดิบ (เดิมขึ้น "RENTAL" กับ "under-50k") พร้อมปุ่มเปิดคำขอและออกใบเสนอราคา
 *   ถึงลูกค้า — ยืนยันว่าได้รับคำขอแล้ว พร้อมรหัสอ้างอิงและสรุปสิ่งที่เลือก
 *              เดิมลูกค้าไม่ได้อีเมลอะไรเลย ส่งแล้วไม่รู้ว่าคำขอไปถึงหรือยัง
 *
 * ฉบับถึงลูกค้าส่งไปยังอีเมลที่ใครก็พิมพ์ลงฟอร์มได้ จึงใส่เฉพาะข้อมูลที่ระบบสร้างเอง
 * (รหัส ชื่ออุปกรณ์จากฐานข้อมูล วันที่ที่ผ่านการตรวจแล้ว ยอดที่คำนวณเอง)
 * ไม่ใส่ชื่อ ข้อความ หรือชื่อแพ็กเกจที่มาจากฟอร์ม คนที่พิมพ์อีเมลคนอื่นลงไปจึงเอาระบบไปส่งข้อความของตัวเองไม่ได้
 */

export type LeadEmailRental = {
  /** YYYY-MM-DD หรือ null ถ้าไม่ได้เลือกวันที่ */
  startDate: string | null
  days: number | null
  items: { label: string; amount: number; isOnRequest: boolean }[]
  subtotal: number
  deposit: number
  hasOnRequest: boolean
}

export type LeadEmailData = {
  refCode: string
  locale: string
  source: string
  name: string
  email: string
  phone: string | null
  company: string | null
  services: string[]
  budgetRange: string | null
  packageName: string | null
  packagePriceTag: string | null
  message: string
  rental: LeadEmailRental | null
}

export type CompanyContact = { name: string; phone: string; email: string; lineId: string }

const serviceLabelsEn: Record<string, string> = {
  WEB: 'Website',
  WEB_APP: 'Web application',
  MOBILE_APP: 'Mobile app',
  PHOTOGRAPHY: 'Photography',
  VIDEO: 'Video',
  STUDIO: 'Studio',
}

const ink = '#16150f'
const muted = '#6b675c'
const body = '#4a463d'
const rule = '#e8e6e1'
const accent = '#c2632a'

function moneyText(value: number, isEnglish: boolean): string {
  return `฿${new Intl.NumberFormat(isEnglish ? 'en-US' : 'th-TH', { maximumFractionDigits: 2 }).format(value)}`
}

function dateRange(rental: LeadEmailRental, isEnglish: boolean): string | null {
  const days = rental.days ?? 1
  const dayText = isEnglish ? `${days} ${days === 1 ? 'day' : 'days'}` : `${days} วัน`
  if (!rental.startDate) return rental.days ? dayText : null

  const format = new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeZone: 'UTC' })
  const show = (iso: string) => format.format(new Date(`${iso}T00:00:00Z`))
  return `${show(rental.startDate)} – ${show(rentalEndDate(rental.startDate, days))} (${dayText})`
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return ''
  return `<tr>
    <td style="padding:7px 16px 7px 0;color:${muted};font-size:13px;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
    <td style="padding:7px 0;color:${ink};font-size:14px">${escapeHtml(value).replace(/\n/g, '<br>')}</td>
  </tr>`
}

function rentalTable(rental: LeadEmailRental, isEnglish: boolean): string {
  const cell = `padding:8px 0;border-bottom:1px solid ${rule};font-size:14px;color:${ink}`
  const onRequest = isEnglish ? 'On request' : 'สอบถามราคา'

  const lines = rental.items
    .map(
      (item) => `<tr>
        <td style="${cell};padding-right:16px">${escapeHtml(item.label)}</td>
        <td style="${cell};text-align:right;white-space:nowrap">${item.isOnRequest ? onRequest : moneyText(item.amount, isEnglish)}</td>
      </tr>`,
    )
    .join('')

  const total = (label: string, value: string, strong = false) => `<tr>
      <td style="padding:6px 16px 0 0;font-size:13px;color:${strong ? ink : muted};${strong ? 'font-weight:700' : ''}">${escapeHtml(label)}</td>
      <td style="padding:6px 0 0;text-align:right;font-size:${strong ? '15px' : '13px'};color:${ink};${strong ? 'font-weight:700' : ''};white-space:nowrap">${value}</td>
    </tr>`

  return `<table style="width:100%;border-collapse:collapse;margin-top:8px">
      <tbody>${lines}</tbody>
      <tbody>
        ${total(isEnglish ? 'Estimated rental (before VAT)' : 'ค่าเช่าตามเรต (ก่อน VAT)', moneyText(rental.subtotal, isEnglish), true)}
        ${rental.deposit > 0 ? total(isEnglish ? 'Security deposit (refunded on return)' : 'เงินประกันอุปกรณ์ (ได้คืนเมื่อคืนอุปกรณ์ครบ)', moneyText(rental.deposit, isEnglish)) : ''}
      </tbody>
    </table>`
}

function shell(brand: string, content: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fbfaf8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:32px 24px">
      <p style="margin:0 0 24px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:${accent}">${escapeHtml(brand)}</p>
      ${content}
    </div>
  </body></html>`
}

function button(href: string, label: string, primary: boolean): string {
  const style = primary
    ? `background:${ink};color:#fbfaf8;border:1px solid ${ink}`
    : `background:transparent;color:${ink};border:1px solid #cfcbc2`
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:6px;font-size:14px;text-decoration:none;${style}">${escapeHtml(label)}</a>`
}

/** อีเมลแจ้งทีมเมื่อมีคำขอใหม่ */
export function leadNotificationEmail(data: LeadEmailData, links: { lead: string; newQuote: string }) {
  const source = leadSourceLabels[data.source as keyof typeof leadSourceLabels] ?? data.source
  const services = data.services
    .map((service) => serviceCategoryLabels[service as keyof typeof serviceCategoryLabels] ?? service)
    .join(', ')
  const budget = data.budgetRange ? (budgetLabels[data.budgetRange] ?? data.budgetRange) : null
  const rentalPeriod = data.rental ? dateRange(data.rental, false) : null

  const subject = `คำขอใหม่ ${data.refCode} · ${source} · ${data.name}`

  const html = shell(
    'Alexan Production',
    `<h1 style="margin:0 0 6px;font-size:20px;color:${ink}">คำขอใหม่ · ${escapeHtml(data.refCode)}</h1>
      <p style="margin:0 0 18px;font-size:14px;color:${muted}">${escapeHtml(source)}${data.rental ? ` · ${data.rental.items.length} รายการ` : ''}</p>
      <p style="margin:0 0 20px">${button(links.lead, 'เปิดคำขอในหลังบ้าน', true)}${button(links.newQuote, 'ออกใบเสนอราคา', false)}</p>
      <table style="width:100%;border-collapse:collapse">
        ${row('ชื่อ', data.name)}
        ${row('อีเมล', data.email)}
        ${row('โทร', data.phone)}
        ${row('บริษัท', data.company)}
        ${row('บริการที่สนใจ', services)}
        ${row('งบประมาณ', budget)}
        ${row('แพ็กเกจที่เลือก', data.packageName ? [data.packageName, data.packagePriceTag].filter(Boolean).join(' · ') : null)}
        ${row('วันที่ใช้งาน', rentalPeriod)}
        ${row('ข้อความ', data.message || 'ลูกค้าไม่ได้พิมพ์ข้อความ')}
      </table>
      ${data.rental ? `<p style="margin:22px 0 0;font-size:13px;font-weight:600;color:${ink}">อุปกรณ์ที่ขอเช่า</p>${rentalTable(data.rental, false)}` : ''}
      ${data.rental?.hasOnRequest ? `<p style="margin:10px 0 0;font-size:12px;color:${muted}">มีบางชิ้นที่ยังไม่ได้ตั้งเรต ยอดข้างบนจึงยังไม่รวมชิ้นเหล่านั้น</p>` : ''}
      <p style="margin:24px 0 0;font-size:12px;color:${muted}">กดตอบกลับอีเมลนี้เพื่อส่งถึงลูกค้าได้โดยตรง</p>`,
  )

  return { subject, html }
}

/** อีเมลยืนยันถึงลูกค้าว่าได้รับคำขอแล้ว */
export function leadReceiptEmail(data: LeadEmailData, company: CompanyContact) {
  const isEnglish = data.locale === 'en'
  const services = data.services
    .map((service) =>
      isEnglish ? (serviceLabelsEn[service] ?? service) : (serviceCategoryLabels[service as keyof typeof serviceCategoryLabels] ?? service),
    )
    .join(', ')
  const rentalPeriod = data.rental ? dateRange(data.rental, isEnglish) : null
  const contact = [company.phone, company.email, company.lineId && `LINE ${company.lineId}`].filter(Boolean).join(' · ')

  const t = isEnglish
    ? {
        subject: `We received your request ${data.refCode} — ${company.name}`,
        title: 'We have your request',
        intro: `Thank you for contacting ${company.name}. Our team will get back to you within one business day.`,
        reference: 'Reference',
        period: 'Rental period',
        services: 'Services',
        gear: 'Gear you asked about',
        estimateNote:
          'This estimate uses our published rates. It excludes VAT and delivery, and no gear has been reserved yet. We will confirm availability before sending a formal quotation.',
        closing: 'Reply to this email if you want to add anything to your request.',
        notYou: 'If you did not send this request, you can ignore this email.',
      }
    : {
        subject: `ได้รับคำขอ ${data.refCode} แล้ว — ${company.name}`,
        title: 'ได้รับคำขอของคุณแล้ว',
        intro: `ขอบคุณที่ติดต่อ ${company.name} ทีมงานจะติดต่อกลับภายในหนึ่งวันทำการ`,
        reference: 'รหัสอ้างอิง',
        period: 'วันที่ใช้งาน',
        services: 'บริการที่สนใจ',
        gear: 'อุปกรณ์ที่ขอเช่า',
        estimateNote:
          'ยอดนี้คำนวณจากเรตที่ประกาศไว้ ยังไม่รวม VAT และค่าจัดส่ง และยังไม่ได้จองคิวอุปกรณ์ ทีมงานจะเช็กวันว่างก่อนออกใบเสนอราคาตัวจริง',
        closing: 'ถ้าต้องการแจ้งรายละเอียดเพิ่ม ตอบกลับอีเมลฉบับนี้ได้เลย',
        notYou: 'ถ้าคุณไม่ได้ส่งคำขอนี้ ไม่ต้องทำอะไร',
      }

  const html = shell(
    company.name,
    `<h1 style="margin:0 0 12px;font-size:22px;color:${ink}">${escapeHtml(t.title)}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:${body}">${escapeHtml(t.intro)}</p>
      <table style="border-collapse:collapse;margin-bottom:8px">
        ${row(t.reference, data.refCode)}
        ${row(t.period, rentalPeriod)}
        ${data.rental ? '' : row(t.services, services)}
      </table>
      ${
        data.rental
          ? `<p style="margin:18px 0 0;font-size:13px;font-weight:600;color:${ink}">${escapeHtml(t.gear)}</p>
             ${rentalTable(data.rental, isEnglish)}
             <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:${muted}">${escapeHtml(t.estimateNote)}</p>`
          : ''
      }
      <p style="margin:26px 0 0;font-size:14px;line-height:1.7;color:${body}">${escapeHtml(t.closing)}</p>
      <p style="margin:18px 0 0;font-size:13px;color:${muted}">${escapeHtml(company.name)}${contact ? `<br>${escapeHtml(contact)}` : ''}</p>
      <p style="margin:24px 0 0;font-size:12px;color:#9a968c">${escapeHtml(t.notYou)}</p>`,
  )

  return { subject: t.subject, html }
}
