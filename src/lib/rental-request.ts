import { rentalEstimateTotals, rentalLineTotal } from './rental-pricing'

/**
 * คำขอเช่าอุปกรณ์จากหน้าเว็บ: จำนวนวัน วันที่ใช้ และค่าเช่าโดยประมาณ
 *
 * ใช้ทั้งในฟอร์มฝั่งเบราว์เซอร์ (ให้ลูกค้าเห็นยอดก่อนกดส่ง) และฝั่งเซิร์ฟเวอร์ (อีเมลกับหลังบ้าน)
 * สูตรชุดเดียวกับใบเสนอราคาเบื้องต้น ตัวเลขที่ลูกค้าเห็นในฟอร์ม ในอีเมล และในหลังบ้านจึงตรงกัน
 * ไฟล์นี้ต้องไม่ import อะไรที่ทำงานเฉพาะฝั่งเซิร์ฟเวอร์
 */

export const MAX_RENTAL_DAYS = 365

/** จองล่วงหน้าได้ไม่เกินสองปี กันปีที่พิมพ์ผิดอย่าง 2096 */
export const MAX_ADVANCE_DAYS = 730

export type RentalRateItem = {
  id: string
  label: string
  dailyRate: number | null
  weeklyRate: number | null
  deposit: number | null
}

export function parseRentalDays(raw: unknown, fallback = 1): number {
  const parsed = Number(raw)
  if (raw === '' || raw === null || raw === undefined || !Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(MAX_RENTAL_DAYS, Math.trunc(parsed))
}

/** วันที่รูปแบบ YYYY-MM-DD ที่มีอยู่จริงในปฏิทิน (31 ก.พ. ไม่ผ่าน) */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** บวกวันให้ YYYY-MM-DD โดยไม่ขึ้นกับเขตเวลาของเครื่องที่รัน */
export function addDaysIso(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** วันคืนอุปกรณ์ — เช่าหนึ่งวันคืนวันเดียวกัน */
export function rentalEndDate(start: string, days: number): string {
  return addDaysIso(start, Math.max(1, Math.trunc(days) || 1) - 1)
}

export type RentalRequestEstimate = {
  lines: { id: string; label: string; amount: number; isOnRequest: boolean }[]
  /** ค่าเช่ารวมก่อน VAT */
  subtotal: number
  /** เงินมัดจำรวม ไม่นับรวมในค่าเช่า */
  deposit: number
  /** มีชิ้นที่ยังไม่ประกาศเรต ยอดรวมจึงยังไม่ครบ */
  hasOnRequest: boolean
}

export function rentalRequestEstimate(items: RentalRateItem[], days: number): RentalRequestEstimate {
  const lines = items.map((item) => {
    const line = rentalLineTotal({ dailyRate: item.dailyRate, weeklyRate: item.weeklyRate, quantity: 1 }, days)
    return { id: item.id, label: item.label, amount: line.amount, isOnRequest: line.isOnRequest }
  })

  const totals = rentalEstimateTotals({
    amounts: lines.map((line) => line.amount),
    deposits: items.map((item) => item.deposit ?? 0),
    vatRate: 0,
    hasOnRequest: lines.some((line) => line.isOnRequest),
  })

  return { lines, subtotal: totals.subtotal, deposit: totals.deposit, hasOnRequest: totals.hasOnRequest }
}
