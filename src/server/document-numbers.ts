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

/** SiteSetting ที่เก็บเลขเอกสารซึ่งห้ามนำกลับมาใช้ */
export const DOCUMENT_NUMBERS_SETTING = 'documentNumbers'

/** เลขสูงสุดที่ห้ามใช้ซ้ำ แยกตามรหัสเดือน เช่น { 'QT-2609': 'QT-2609-0003' } */
export type BurnedNumbers = Record<string, string>

function sequenceOf(value: string): number {
  const suffix = value.slice(value.lastIndexOf('-') + 1)
  return /^\d{4,5}$/.test(suffix) ? Number(suffix) : 0
}

/**
 * เลขของเอกสารที่ถูกลบไปแล้วแต่ลูกค้าเคยได้รับ
 *
 * เลขถัดไปคิดจากเลขสูงสุดที่ยังมีอยู่ ลบใบล่าสุดทิ้งแล้วใบใหม่จะได้เลขเดิม
 * ถ้าใบที่ลบเคยส่งให้ลูกค้าแล้ว ลูกค้าจะถือเอกสารสองใบที่เลขเดียวกันแต่ตัวเลขข้างในต่างกัน
 * จึงจดเลขนั้นไว้ แล้วนับรวมตอนออกเลขใหม่
 */
export function readBurnedNumbers(value: unknown): BurnedNumbers {
  const burned = typeof value === 'object' && value !== null ? (value as { burned?: unknown }).burned : null
  if (typeof burned !== 'object' || burned === null) return {}
  return Object.fromEntries(
    Object.entries(burned).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

export function burnDocumentNumber(burned: BurnedNumbers, number: string): BurnedNumbers {
  const prefix = number.slice(0, number.lastIndexOf('-'))
  const current = burned[prefix]
  return { ...burned, [prefix]: current && sequenceOf(current) >= sequenceOf(number) ? current : number }
}
