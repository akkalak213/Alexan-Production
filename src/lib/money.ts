/**
 * เงินคิดเป็นสตางค์ (จำนวนเต็ม) เสมอ ไม่คิดเป็นบาทแบบทศนิยม
 *
 * ทศนิยมลอยตัวของ JavaScript เก็บ 1.005 เป็น 1.00499999… การปัดสองตำแหน่งจึงได้ 1.00 แทน 1.01
 * สูตรเดิมคิด VAT 7% ของ 107.50 (= 7.525) ได้ 7.52 ทั้งที่ต้องได้ 7.53 เอกสารจึงคลาดไปหนึ่งสตางค์
 * ฐานข้อมูลเก็บ Decimal(12,2) ถูกอยู่แล้ว ความคลาดเกิดตอนคำนวณก่อนบันทึก
 *
 * ทางแก้: อ่านตัวเลขจากรูปข้อความเป็นจำนวนเต็มโดยตรง ไม่ผ่านการคูณทศนิยม
 * แล้วคิดด้วย BigInt ปัดครึ่งออกจากศูนย์ (half-up) แบบที่ใช้กับเอกสารการเงิน
 */

const NUMBER_PATTERN = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i

/** ข้อความตัวเลขที่ parse ต่อได้ รับ number, ข้อความที่มีจุลภาคหรือ ฿ และ Decimal ของ Prisma */
function numberText(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'bigint') return String(value)
  if (typeof value === 'string') return value.replace(/[,\s฿]/g, '')
  if (value !== null && typeof value === 'object') return String(value)
  return ''
}

/** ค่านี้อ่านเป็นตัวเลขได้หรือไม่ ข้อความว่างถือว่าไม่ใช่ */
export function isNumberLike(value: unknown): boolean {
  const text = numberText(value)
  return /\d/.test(text) && NUMBER_PATTERN.test(text)
}

/**
 * ค่าตัวเลข × 10^scale เป็นจำนวนเต็ม ปัดครึ่งออกจากศูนย์
 * เช่น toScaledInt('1.005', 2) = 101n และ toScaledInt(7.5, 2) = 750n
 * ค่าที่อ่านไม่ออกคืน 0n
 */
export function toScaledInt(value: unknown, scale: number): bigint {
  const match = NUMBER_PATTERN.exec(numberText(value))
  if (!match || (!match[2] && !match[3])) return 0n

  const [, sign, integerDigits = '', fractionDigits = '', exponentText = '0'] = match
  const exponent = Number(exponentText)
  // ตัวเลขระดับ 1e40 ขึ้นไปไม่ใช่จำนวนเงินจริง และจะสร้าง BigInt ขนาดมหาศาลโดยเปล่าประโยชน์
  if (Math.abs(exponent) > 40) return 0n

  const digits = integerDigits + fractionDigits
  const cut = integerDigits.length + exponent + scale

  let whole: string
  let next: string
  if (cut <= 0) {
    whole = '0'
    next = cut === 0 ? (digits[0] ?? '0') : '0'
  } else if (cut >= digits.length) {
    whole = digits + '0'.repeat(cut - digits.length)
    next = '0'
  } else {
    whole = digits.slice(0, cut)
    next = digits[cut]
  }

  let magnitude = BigInt(whole || '0')
  if (next >= '5') magnitude += 1n
  return sign === '-' ? -magnitude : magnitude
}

/** จำนวนสตางค์จากค่าเงินบาท */
export const toSatang = (value: unknown): bigint => toScaledInt(value, 2)

/**
 * สตางค์ → บาทเป็น number สำหรับแสดงผลและส่งให้ Prisma
 * จำนวนเต็มหารร้อยได้ค่าที่ใกล้ทศนิยมสองตำแหน่งนั้นที่สุดเสมอ แสดงผลสองตำแหน่งจึงตรงตัว
 */
export const fromSatang = (satang: bigint): number => Number(satang) / 100

/** หารแล้วปัดครึ่งออกจากศูนย์ */
export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n
  const n = numerator < 0n ? -numerator : numerator
  const d = denominator < 0n ? -denominator : denominator
  const quotient = (n * 2n + d) / (d * 2n)
  return negative ? -quotient : quotient
}
