/**
 * วันเวลาตามเวลาประเทศไทย
 *
 * เซิร์ฟเวอร์บน Railway ใช้เวลา UTC ซึ่งช้ากว่าไทยเจ็ดชั่วโมง
 * ถ้าไม่ระบุเขตเวลา ใบเสนอราคาที่ออกตอนเที่ยงคืนถึงเจ็ดโมงเช้าจะพิมพ์วันที่เป็นเมื่อวาน
 * และเอกสารที่ออกเช้ามืดวันที่ 1 จะได้รหัสเดือนก่อนหน้า
 */

export const BANGKOK_TIME_ZONE = 'Asia/Bangkok'

/** ประเทศไทยไม่มีเวลาออมแสง ห่างจาก UTC เจ็ดชั่วโมงคงที่ตลอดปี */
const OFFSET_MS = 7 * 60 * 60 * 1000

/** ปีสองหลักกับเดือนสองหลักตามเวลาไทย เช่น { year: '26', month: '09' } */
export function bangkokYearMonth(date = new Date()): { year: string; month: string } {
  const shifted = new Date(date.getTime() + OFFSET_MS)
  return {
    year: String(shifted.getUTCFullYear()).slice(2),
    month: String(shifted.getUTCMonth() + 1).padStart(2, '0'),
  }
}

/** เวลา 00:00 น. วันที่ 1 ของเดือนนั้นตามเวลาไทย */
export function startOfBangkokMonth(date = new Date()): Date {
  const shifted = new Date(date.getTime() + OFFSET_MS)
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - OFFSET_MS)
}
