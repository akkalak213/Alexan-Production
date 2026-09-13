import { bangkokYearMonth } from '../lib/bangkok-time'

/**
 * เลขเอกสารรูปแบบ รหัส-ปปดด-ลำดับ เช่น QT-2609-0007 (ใบเสนอราคา) และ AX-2609-0042 (คำขอ)
 *
 * เดิมนับจำนวนเอกสารในเดือนแล้วบวกหนึ่ง ซึ่งพังสองกรณี
 *   ลบเอกสารกลางเดือน: จำนวนลดลง เลขถัดไปจะชนกับเลขที่มีอยู่แล้ว
 *   บันทึกพร้อมกันสองคน: ทั้งคู่นับได้เท่ากัน ได้เลขเดียวกัน คนที่สองเจอ "บันทึกไม่สำเร็จ"
 * ตอนนี้ต่อจากเลขลำดับสูงสุดที่ใช้ไปแล้ว และให้ unique index ในฐานข้อมูลเป็นคนตัดสินตอนเขียน
 * ถ้าชนก็ลองเลขถัดไป (withUniqueRetry)
 */

export function documentPrefix(code: string, date = new Date()): string {
  const { year, month } = bangkokYearMonth(date)
  return `${code}-${year}${month}`
}

/** เลขถัดจากลำดับสูงสุดที่ใช้ไปแล้วในเดือน offset ใช้ตอนลองใหม่หลังเลขชน */
export function nextDocumentNumber(prefix: string, existing: string[], offset = 0): string {
  const highest = existing.reduce((max, value) => {
    const suffix = value.slice(prefix.length + 1)
    // ข้ามเลขรูปแบบอื่น เช่นเลขสำรองจากเวลาที่ระบบรุ่นก่อนใช้ตอนชนกันหลายรอบ
    if (!value.startsWith(`${prefix}-`) || !/^\d{4,5}$/.test(suffix)) return max
    return Math.max(max, Number(suffix))
  }, 0)

  return `${prefix}-${String(highest + 1 + offset).padStart(4, '0')}`
}

/** error จาก Prisma ว่าค่าชนกับ unique index */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
}

/** เรียกซ้ำเมื่อชน unique index — attempt เริ่มที่ 0 และส่งให้ผู้เรียกใช้ขยับเลข */
export async function withUniqueRetry<T>(run: (attempt: number) => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run(attempt)
    } catch (error) {
      if (attempt >= attempts - 1 || !isUniqueViolation(error)) throw error
    }
  }
}
