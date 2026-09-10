/**
 * ตัวเลือกงบประมาณของฟอร์มติดต่อ
 *
 * แยกออกมาจาก validations.ts เพราะไฟล์นั้นประกาศ schema ของ zod ไว้ที่ระดับโมดูล
 * ฟอร์มฝั่ง client ต้องการแค่รายการนี้ซึ่งเป็น array ของ string ธรรมดา
 * แต่การ import อะไรก็ตามจากไฟล์นั้นลาก zod ทั้งก้อนขึ้นไปอยู่ใน bundle ของเบราว์เซอร์ด้วย
 * (วัดได้ 288 KB ก่อนบีบอัด บนหน้าติดต่อซึ่งเป็นหน้าที่ลูกค้าตัดสินใจ)
 *
 * ที่นี่ต้องไม่ import อะไรที่ทำงานเฉพาะฝั่ง server เข้ามาเด็ดขาด ไม่งั้นปัญหาเดิมจะกลับมา
 */

export const budgetRanges = [
  'under-50k',
  '50k-150k',
  '150k-500k',
  'over-500k',
  'not-sure',
] as const

export type BudgetRange = (typeof budgetRanges)[number]

/**
 * จับราคาแพ็กเกจเข้าช่วงงบประมาณ ใช้เติมช่องงบให้อัตโนมัติเมื่อลูกค้ากดเลือกแพ็กเกจ
 * ราคาแพ็กเกจเป็นราคาเริ่มต้น งานจริงมักบานปลายขึ้น จึงเลือกช่วงที่ครอบราคานั้นไว้
 */
export function budgetRangeFor(price: number | null): BudgetRange | null {
  if (price === null) return null
  if (price < 50_000) return 'under-50k'
  if (price < 150_000) return '50k-150k'
  if (price < 500_000) return '150k-500k'
  return 'over-500k'
}
