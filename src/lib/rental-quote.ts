import { rentalLineTotal } from './rental-pricing'
import { rentalEndDate } from './rental-request'

/**
 * ค่าตั้งต้นของใบเสนอราคาที่ออกจากคำขอของลูกค้า
 *
 * เดิมหน้าออกใบเสนอราคาดึงมาแค่ชื่ออุปกรณ์ ราคาต่อหน่วยว่าง หน่วยเป็น "ชิ้น"
 * เงื่อนไขเป็นของงานบริการ (มัดจำ 50% ก่อนเริ่มงาน) และหัก ณ ที่จ่าย 3% กับลูกค้าทุกคน
 * ทีมขายต้องเปิดหน้าอุปกรณ์อีกแท็บเพื่อลอกเรตมาพิมพ์เอง ซึ่งเป็นจุดที่ตัวเลขผิดได้ง่ายที่สุด
 *
 * ทุกค่าที่นี่เป็นแค่ค่าตั้งต้น แอดมินแก้ได้ก่อนบันทึกเสมอ
 */

export type QuoteLineDraft = { description: string; quantity: string; unit: string; unitPrice: string }

export type RentalQuoteItem = {
  label: string
  quantity: number
  /** null = ลูกค้าไม่ได้ระบุ */
  days: number | null
  dailyRate: number | null
  weeklyRate: number | null
}

type QuoteLocale = 'th' | 'en'

const copy = {
  th: {
    day: 'วัน',
    week: 'สัปดาห์',
    rental: (days: number) => `ค่าเช่า ${days} วัน`,
    weekly: 'ค่าเช่ารายสัปดาห์',
    extra: 'ค่าเช่ารายวัน ส่วนที่เกินสัปดาห์',
    pieces: (count: number) => `× ${count} ชิ้น`,
  },
  en: {
    day: 'day',
    week: 'week',
    rental: (days: number) => `rental, ${days} ${days === 1 ? 'day' : 'days'}`,
    weekly: 'weekly rental',
    extra: 'daily rental beyond full weeks',
    pieces: (count: number) => `× ${count}`,
  },
} satisfies Record<QuoteLocale, unknown>

const amountText = (value: number | null) => (value === null ? '' : String(value))

/**
 * รายการค่าเช่า
 *
 * เช่าครบสัปดาห์และเรตสัปดาห์ถูกกว่า แยกเป็นสองบรรทัด (สัปดาห์ + วันที่เกิน)
 * เพราะใบเสนอราคาเก็บเป็นจำนวน × ราคาต่อหน่วย บรรทัดเดียวแสดงสองเรตพร้อมกันไม่ได้
 * ยอดรวมยังเท่ากับ rentalLineTotal ที่ใบเสนอราคาเบื้องต้นใช้ ลูกค้าจึงเห็นตัวเลขเดียวกันทั้งสองใบ
 */
export function rentalQuoteLines(
  items: RentalQuoteItem[],
  { locale = 'th', fallbackDays = 1 }: { locale?: string; fallbackDays?: number } = {},
): QuoteLineDraft[] {
  const t = copy[locale === 'en' ? 'en' : 'th']

  return items.flatMap((item) => {
    const days = Math.max(1, Math.trunc(item.days ?? fallbackDays) || 1)
    const quantity = Math.max(1, Math.trunc(item.quantity) || 1)
    const name = quantity > 1 ? `${item.label} ${t.pieces(quantity)}` : item.label
    const price = rentalLineTotal({ dailyRate: item.dailyRate, weeklyRate: item.weeklyRate, quantity: 1 }, days)

    if (price.isOnRequest || price.weeks === 0) {
      return [
        {
          description: `${name} — ${t.rental(days)}`,
          quantity: String(days * quantity),
          unit: t.day,
          unitPrice: amountText(item.dailyRate),
        },
      ]
    }

    const lines: QuoteLineDraft[] = [
      {
        description: `${name} — ${t.weekly}`,
        quantity: String(price.weeks * quantity),
        unit: t.week,
        unitPrice: amountText(item.weeklyRate),
      },
    ]
    if (price.extraDays > 0) {
      lines.push({
        description: `${name} — ${t.extra}`,
        quantity: String(price.extraDays * quantity),
        unit: t.day,
        unitPrice: amountText(item.dailyRate),
      })
    }
    return lines
  })
}

/** หมายเหตุบนใบเสนอราคา: ช่วงวันที่ใช้งานและเงินประกันอุปกรณ์ ซึ่งไม่ได้อยู่ในยอดชำระ */
export function rentalQuoteNotes({
  locale = 'th',
  startDate,
  days,
  deposit,
}: {
  locale?: string
  startDate: string | null
  days: number | null
  deposit: number
}): string {
  const isEnglish = locale === 'en'
  const date = new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeZone: 'UTC' })
  const format = (iso: string) => date.format(new Date(`${iso}T00:00:00Z`))
  const money = new Intl.NumberFormat(isEnglish ? 'en-US' : 'th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const lines: string[] = []

  if (startDate) {
    const span = days ?? 1
    const range = `${format(startDate)} – ${format(rentalEndDate(startDate, span))}`
    lines.push(isEnglish ? `Rental period: ${range} (${span} ${span === 1 ? 'day' : 'days'})` : `วันที่ใช้งาน ${range} (${span} วัน)`)
  }

  if (deposit > 0) {
    lines.push(
      isEnglish
        ? `Security deposit ฿${money.format(deposit)} is paid at pickup and refunded in full when all gear is returned in its original condition. It is not included in the total above.`
        : `เงินประกันอุปกรณ์ ฿${money.format(deposit)} ชำระวันรับอุปกรณ์ และคืนเต็มจำนวนเมื่อส่งคืนครบและอยู่ในสภาพเดิม ไม่รวมอยู่ในยอดชำระข้างต้น`,
    )
  }

  return lines.join('\n')
}

/**
 * เงื่อนไขของการเช่า
 *
 * ประกอบจากข้อความที่ประกาศบนหน้าเช่าอุปกรณ์อยู่แล้ว (เงินประกัน บัตรประชาชน ค่าจัดส่ง)
 * ใบเสนอราคาเบื้องต้นที่ลูกค้ากดเองใช้ชุดเดียวกัน ลูกค้าจึงเห็นเงื่อนไขตรงกันทั้งสองใบ
 * ไม่ได้แต่งเงื่อนไขใหม่ขึ้นมาเอง ข้อที่ต้องการเพิ่มให้แก้ในฟอร์มก่อนบันทึก
 */
export function rentalQuoteTerms(locale: string, validDays: number): string {
  return (
    locale === 'en'
      ? [
          `This quotation is valid for ${validDays} days from the issue date.`,
          'A refundable security deposit and photo ID are required at pickup.',
          'The security deposit is not a booking fee or prepayment. It is held separately from the rental fee and refunded in full when all gear is returned in its original condition.',
          'Prices exclude delivery.',
        ]
      : [
          `ราคานี้ยืนยันภายใน ${validDays} วันนับจากวันที่ออกใบเสนอราคา`,
          'ผู้เช่าต้องวางเงินประกันอุปกรณ์และแสดงบัตรประชาชนในวันรับอุปกรณ์',
          'เงินประกันอุปกรณ์เก็บแยกจากค่าเช่า ไม่ใช่เงินจองหรือค่าเช่าล่วงหน้า และคืนเต็มจำนวนเมื่อส่งอุปกรณ์คืนครบและอยู่ในสภาพเดิม',
          'ราคายังไม่รวมค่าจัดส่ง',
        ]
  ).join('\n')
}

/**
 * อัตราหัก ณ ที่จ่ายตั้งต้น
 *
 * ผู้จ่ายที่เป็นบุคคลธรรมดาไม่มีหน้าที่หักภาษี ณ ที่จ่าย จึงเริ่มที่ 0 เมื่อคำขอไม่ได้กรอกชื่อบริษัท
 * นิติบุคคลหักค่าเช่าทรัพย์สิน 5% ส่วนค่าบริการใช้อัตราในหน้าตั้งค่า (ปกติ 3%)
 */
export function defaultWithholdingRate({
  isRental,
  hasCompany,
  serviceRate,
}: {
  isRental: boolean
  hasCompany: boolean
  serviceRate: number
}): number {
  if (!hasCompany) return 0
  return isRental ? 5 : serviceRate
}

const unitLabels: Record<QuoteLocale, Record<string, string>> = {
  th: { PROJECT: 'โปรเจกต์', DAY: 'วัน', HALF_DAY: 'ครึ่งวัน', HOUR: 'ชั่วโมง', MONTH: 'เดือน', PERSON: 'คน', CUSTOM: 'งาน' },
  en: { PROJECT: 'project', DAY: 'day', HALF_DAY: 'half day', HOUR: 'hour', MONTH: 'month', PERSON: 'person', CUSTOM: 'job' },
}

/** แพ็กเกจที่ลูกค้ากดเลือกจากหน้าบริการ ตั้งเป็นรายการแรกพร้อมราคาเริ่มต้น */
export function packageQuoteLine({
  locale = 'th',
  serviceName,
  packageName,
  priceFrom,
  priceUnit,
}: {
  locale?: string
  serviceName: string | null
  packageName: string
  priceFrom: number | null
  priceUnit: string
}): QuoteLineDraft {
  const labels = unitLabels[locale === 'en' ? 'en' : 'th']
  return {
    description: [serviceName, packageName].filter(Boolean).join(' · '),
    quantity: '1',
    unit: labels[priceUnit] ?? labels.CUSTOM,
    unitPrice: priceUnit === 'CUSTOM' ? '' : amountText(priceFrom),
  }
}
