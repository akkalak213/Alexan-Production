import { toSatang } from './money'

/**
 * แปลงจำนวนเงินเป็นตัวอักษรภาษาไทย เช่น 15000 → "หนึ่งหมื่นห้าพันบาทถ้วน"
 *
 * เอกสารทางการเงินของไทยต้องมีบรรทัดนี้เสมอ เพราะกันการแก้ตัวเลขภายหลัง
 * ผลลัพธ์ตรงกับฟังก์ชัน BAHTTEXT ของ Excel ซึ่งเป็นแบบที่ฝ่ายบัญชีใช้เทียบ
 *
 * กฎที่ต่างจากการอ่านเลขทั่วไป
 *   หลักสิบ: 1 อ่าน "สิบ" และ 2 อ่าน "ยี่สิบ"
 *   หลักหน่วยที่เป็น 1 อ่าน "เอ็ด" เมื่อมีหลักที่สูงกว่าไม่เป็นศูนย์ นับข้ามกลุ่มล้านด้วย
 *     เช่น 10,000,001 = สิบล้านเอ็ด
 *   สตางค์อ่านเป็นจำนวนของมันเอง 0.01 = หนึ่งสตางค์
 *   ไม่ถึงหนึ่งบาทไม่ต้องขึ้นต้นด้วย "ศูนย์บาท" เช่น 0.50 = ห้าสิบสตางค์
 *
 * รุ่นก่อนอ่าน 100.01 เป็น "หนึ่งร้อยบาทเอ็ดสตางค์" และ 10,000,001 เป็น "สิบล้านหนึ่ง"
 */

const DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

/** อ่านเลข 0–999,999 หนึ่งกลุ่ม — hasHigher คือมีหลักที่สูงกว่ากลุ่มนี้ที่ไม่เป็นศูนย์ */
function readGroup(value: number, hasHigher: boolean): string {
  const text = String(value)
  let result = ''

  for (let i = 0; i < text.length; i++) {
    const digit = Number(text[i])
    if (digit === 0) continue

    const place = text.length - i - 1

    if (place === 1) {
      result += digit === 1 ? 'สิบ' : digit === 2 ? 'ยี่สิบ' : `${DIGITS[digit]}สิบ`
    } else if (place === 0 && digit === 1 && (hasHigher || value >= 10)) {
      result += 'เอ็ด'
    } else {
      result += DIGITS[digit] + PLACES[place]
    }
  }

  return result
}

/** อ่านจำนวนเต็มบวก แบ่งกลุ่มละหกหลักคั่นด้วย "ล้าน" (1,000,000,000,000 = หนึ่งล้านล้าน) */
function readInteger(value: bigint): string {
  const groups: number[] = []
  for (let rest = value; rest > 0n; rest /= 1_000_000n) {
    groups.unshift(Number(rest % 1_000_000n))
  }

  let result = ''
  let hasHigher = false

  groups.forEach((group, index) => {
    result += readGroup(group, hasHigher)
    if (index < groups.length - 1) result += 'ล้าน'
    if (group > 0) hasHigher = true
  })

  return result
}

export function bahtText(amount: unknown): string {
  if (typeof amount === 'number' && !Number.isFinite(amount)) return ''

  const satang = toSatang(amount)
  const negative = satang < 0n
  const absolute = negative ? -satang : satang
  const baht = absolute / 100n
  const cents = Number(absolute % 100n)

  const text =
    cents === 0
      ? `${baht === 0n ? 'ศูนย์' : readInteger(baht)}บาทถ้วน`
      : `${baht === 0n ? '' : `${readInteger(baht)}บาท`}${readGroup(cents, false)}สตางค์`

  return `${negative ? 'ลบ' : ''}${text}`
}
