import { divideRounded, fromSatang, isNumberLike, toScaledInt, toSatang } from './money'

/**
 * คำนวณยอดใบเสนอราคา
 *
 * ใช้ทั้งฝั่ง client (แสดงยอดสดขณะพิมพ์) และฝั่ง server (ค่าที่บันทึกจริง)
 * ห้ามคำนวณคนละที่คนละสูตร ไม่งั้นตัวเลขบนจอกับในฐานข้อมูลจะไม่ตรงกัน
 * ทั้งสองฝั่งส่งข้อความตามที่พิมพ์เข้ามาตรง ๆ ไม่แปลงเป็น number ก่อน
 *
 * ลำดับตามหลักบัญชีไทย:
 *   ยอดรวม → หักส่วนลด → บวก VAT → หักภาษี ณ ที่จ่าย → ยอดชำระสุทธิ
 * ภาษีหัก ณ ที่จ่ายคิดจากฐานก่อน VAT เสมอ
 *
 * คิดเป็นสตางค์ทั้งหมด (ดู money.ts) ปัดครึ่งขึ้นที่สตางค์ทีละขั้น แล้วค่อยรวม
 * ยอดรวมจึงเท่ากับผลรวมของบรรทัดที่พิมพ์บนเอกสารเสมอ ไม่มีเศษซ่อนอยู่
 */

type Amount = number | string | null | undefined

export type QuoteLine = {
  /** รับได้ทั้งตัวเลขและข้อความจากช่องกรอก เช่น "1,500.50" */
  quantity: Amount
  unitPrice: Amount
}

export type QuoteTotals = {
  subtotal: number
  discount: number
  afterDiscount: number
  vatAmount: number
  withholdingAmount: number
  total: number
}

/** ขอบบนของคอลัมน์ในฐานข้อมูล: จำนวน Decimal(10,2) และเงิน Decimal(12,2) */
const MAX_QUANTITY_HUNDREDTHS = 9_999_999_999n
const MAX_AMOUNT_SATANG = 999_999_999_999n

const atLeastZero = (value: bigint) => (value < 0n ? 0n : value)

/** อัตราเป็นหน่วยหนึ่งในหมื่น (7% = 700) จำกัด 0–100% ตามคอลัมน์ Decimal(5,2) */
function basisPoints(rate: Amount): bigint {
  const points = toScaledInt(rate, 2)
  return points < 0n ? 0n : points > 10_000n ? 10_000n : points
}

function lineSatang(line: QuoteLine): bigint {
  const quantityHundredths = atLeastZero(toScaledInt(line.quantity, 2))
  const unitPriceSatang = atLeastZero(toSatang(line.unitPrice))
  return divideRounded(unitPriceSatang * quantityHundredths, 100n)
}

/** จำนวนและราคาต่อหน่วยในรูปที่บันทึกจริง: ทศนิยมสองตำแหน่งตามคอลัมน์ ไม่ติดลบ */
export function normalizeLine(line: QuoteLine): { quantity: number; unitPrice: number } {
  return {
    quantity: fromSatang(atLeastZero(toScaledInt(line.quantity, 2))),
    unitPrice: fromSatang(atLeastZero(toSatang(line.unitPrice))),
  }
}

/** อัตราภาษีในรูปที่บันทึกจริง */
export function normalizeRate(rate: Amount): number {
  return fromSatang(basisPoints(rate))
}

export function lineAmount(line: QuoteLine): number {
  return fromSatang(lineSatang(line))
}

export function computeQuoteTotals({
  lines,
  discount = 0,
  vatRate = 7,
  withholdingRate = 0,
}: {
  lines: QuoteLine[]
  discount?: Amount
  vatRate?: Amount
  withholdingRate?: Amount
}): QuoteTotals {
  const subtotal = lines.reduce((sum, line) => sum + lineSatang(line), 0n)
  const requestedDiscount = atLeastZero(toSatang(discount))
  const appliedDiscount = requestedDiscount > subtotal ? subtotal : requestedDiscount
  const afterDiscount = subtotal - appliedDiscount

  const vatAmount = divideRounded(afterDiscount * basisPoints(vatRate), 10_000n)
  const withholdingAmount = divideRounded(afterDiscount * basisPoints(withholdingRate), 10_000n)

  return {
    subtotal: fromSatang(subtotal),
    discount: fromSatang(appliedDiscount),
    afterDiscount: fromSatang(afterDiscount),
    vatAmount: fromSatang(vatAmount),
    withholdingAmount: fromSatang(withholdingAmount),
    total: fromSatang(afterDiscount + vatAmount - withholdingAmount),
  }
}

/**
 * ปัญหาของข้อมูลใบเสนอราคาที่ต้องบอกผู้กรอก — คืน null ถ้าบันทึกได้
 *
 * สูตรคำนวณตัดค่าติดลบเป็นศูนย์ให้อยู่แล้ว แต่ถ้าปล่อยผ่านเงียบ ๆ คนที่กรอก "-500" เพื่อหมายถึงส่วนลด
 * จะได้เอกสารที่รายการนั้นกลายเป็นศูนย์โดยไม่รู้ตัว จึงต้องบอกให้แก้ก่อนบันทึก
 */
export function quoteInputProblem({
  lines,
  discount,
  vatRate,
  withholdingRate,
}: {
  lines: QuoteLine[]
  discount?: Amount
  vatRate?: Amount
  withholdingRate?: Amount
}): string | null {
  // ช่องว่างถือเป็นศูนย์ได้ แต่ข้อความที่ไม่ใช่ตัวเลข เช่น "2 วัน" ต้องให้แก้
  const unreadable = (value: Amount) => String(value ?? '').trim() !== '' && !isNumberLike(value)

  for (const [index, line] of lines.entries()) {
    const label = `รายการที่ ${index + 1}`
    if (unreadable(line.quantity) || unreadable(line.unitPrice)) {
      return `${label}: จำนวนและราคาต้องเป็นตัวเลข`
    }

    const quantity = toScaledInt(line.quantity, 2)
    if (quantity <= 0n) return `${label}: จำนวนต้องมากกว่าศูนย์`
    if (toSatang(line.unitPrice) < 0n) {
      return `${label}: ราคาต้องไม่ติดลบ ถ้าเป็นส่วนลดให้ใส่ในช่องส่วนลด`
    }
    if (quantity > MAX_QUANTITY_HUNDREDTHS || lineSatang(line) > MAX_AMOUNT_SATANG) {
      return `${label}: ตัวเลขสูงเกินกว่าที่ระบบบันทึกได้`
    }
  }

  if (unreadable(discount) || unreadable(vatRate) || unreadable(withholdingRate)) {
    return 'ส่วนลดและอัตราภาษีต้องเป็นตัวเลข'
  }
  if (toSatang(discount) < 0n) return 'ส่วนลดต้องไม่ติดลบ'

  const rates = [
    ['VAT', vatRate],
    ['ภาษีหัก ณ ที่จ่าย', withholdingRate],
  ] as const
  for (const [label, rate] of rates) {
    const points = toScaledInt(rate, 2)
    if (points < 0n || points > 10_000n) return `${label} ต้องอยู่ระหว่าง 0 ถึง 100%`
  }

  const subtotal = lines.reduce((sum, line) => sum + lineSatang(line), 0n)
  if (toSatang(discount) > subtotal) return 'ส่วนลดมากกว่ายอดรวมของรายการ'

  const totals = computeQuoteTotals({ lines, discount, vatRate, withholdingRate })
  if (subtotal > MAX_AMOUNT_SATANG || toSatang(totals.total) > MAX_AMOUNT_SATANG) {
    return 'ยอดรวมสูงเกินกว่าที่ระบบบันทึกได้'
  }

  return null
}
