import { divideRounded, fromSatang, toScaledInt, toSatang } from './money'

/**
 * คิดราคาค่าเช่าอุปกรณ์
 *
 * แยกออกมาเป็นโมดูลของตัวเองเพราะจะถูกเรียกจากสองที่ที่ต้องได้ตัวเลขตรงกันเป๊ะ ๆ
 * คือใบเสนอราคาเบื้องต้นที่ลูกค้ากดเอง และหน้าออกใบเสนอราคาจริงในหลังบ้าน
 * ถ้าคิดคนละที่คนละสูตร ลูกค้าจะถือกระดาษที่ตัวเลขไม่ตรงกับที่ทีมขายเสนอ
 *
 * ตอนนี้รองรับเฉพาะค่าเช่าอุปกรณ์ ซึ่งเป็นหมวดที่ราคานิ่งที่สุด — มีเรตต่อวันต่อสัปดาห์
 * ตายตัวอยู่ในฐานข้อมูลอยู่แล้ว ไม่ต้องประเมินขอบเขตงาน
 * งานบริการอย่างถ่ายภาพหรือทำเว็บยังคิดอัตโนมัติไม่ได้ เพราะราคาขึ้นกับขอบเขตที่ต้องคุยกันก่อน
 *
 * คิดเป็นสตางค์ทั้งหมดด้วยสูตรปัดเศษชุดเดียวกับใบเสนอราคา (ดู money.ts)
 */

export type RentalPriceInput = {
  /** ค่าเช่าต่อวัน — null คือยังไม่ประกาศราคา ต้องสอบถาม */
  dailyRate: number | null
  /** ค่าเช่าต่อสัปดาห์ ถ้ามีจะถูกกว่าคิดรายวันเจ็ดวัน */
  weeklyRate: number | null
  quantity: number
}

export type RentalLineTotal = {
  /** คิดราคาไม่ได้เพราะยังไม่ประกาศเรตต่อวัน */
  isOnRequest: boolean
  amount: number
  /** อธิบายว่าคิดมาจากอะไร เช่น 1 สัปดาห์ + 2 วัน */
  weeks: number
  extraDays: number
}

/**
 * ค่าเช่าของอุปกรณ์หนึ่งชิ้นตามจำนวนวัน
 *
 * เรตสัปดาห์ใช้เมื่อเช่าครบเจ็ดวันขึ้นไป ส่วนที่เหลือคิดรายวัน
 * แล้วเทียบกับการคิดรายวันล้วนอีกที เลือกอันที่ถูกกว่าให้ลูกค้าเสมอ
 * (บางชิ้นตั้งเรตสัปดาห์ไว้สูงกว่ารายวันคูณเจ็ด ซึ่งน่าจะเป็นการกรอกพลาด
 * ไม่ควรให้ลูกค้าเป็นคนรับผลของความพลาดนั้น)
 */
export function rentalLineTotal(item: RentalPriceInput, days: number): RentalLineTotal {
  const safeDays = Math.max(1, Math.trunc(days) || 1)
  const quantity = BigInt(Math.max(1, Math.trunc(item.quantity) || 1))

  if (item.dailyRate === null) {
    return { isOnRequest: true, amount: 0, weeks: 0, extraDays: safeDays }
  }

  const daily = toSatang(item.dailyRate)
  const dailyOnly = daily * BigInt(safeDays)

  if (item.weeklyRate === null || safeDays < 7) {
    return { isOnRequest: false, amount: fromSatang(dailyOnly * quantity), weeks: 0, extraDays: safeDays }
  }

  const weeks = Math.floor(safeDays / 7)
  const extraDays = safeDays % 7
  const weekly = toSatang(item.weeklyRate) * BigInt(weeks) + daily * BigInt(extraDays)

  return weekly <= dailyOnly
    ? { isOnRequest: false, amount: fromSatang(weekly * quantity), weeks, extraDays }
    : { isOnRequest: false, amount: fromSatang(dailyOnly * quantity), weeks: 0, extraDays: safeDays }
}

export type RentalEstimateTotals = {
  subtotal: number
  vatAmount: number
  total: number
  /** เงินมัดจำรวม — คืนให้เมื่อส่งของครบ จึงไม่รวมอยู่ในยอดชำระ */
  deposit: number
  /** มีอย่างน้อยหนึ่งชิ้นที่ยังไม่ประกาศราคา ยอดรวมจึงยังไม่ครบ */
  hasOnRequest: boolean
}

export function rentalEstimateTotals({
  amounts,
  deposits,
  vatRate,
  hasOnRequest,
}: {
  amounts: number[]
  deposits: number[]
  vatRate: number
  hasOnRequest: boolean
}): RentalEstimateTotals {
  const subtotal = amounts.reduce((sum, value) => sum + toSatang(value), 0n)
  const rate = toScaledInt(vatRate, 2)
  const vatAmount = divideRounded(subtotal * (rate < 0n ? 0n : rate), 10_000n)

  return {
    subtotal: fromSatang(subtotal),
    vatAmount: fromSatang(vatAmount),
    total: fromSatang(subtotal + vatAmount),
    deposit: fromSatang(deposits.reduce((sum, value) => sum + toSatang(value), 0n)),
    hasOnRequest,
  }
}
