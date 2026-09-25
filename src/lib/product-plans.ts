import type { BillingCycle } from '@/generated/prisma/enums'
import { safeExternalUrl } from './external-link'

/**
 * แพ็กเกจราคาของผลิตภัณฑ์จากฟอร์มหลังบ้าน
 *
 * ช่องชื่อซ้ำกันหลายชุด (planNameTh, planPrice, …) อ่านด้วย getAll แล้วจับคู่ตามลำดับ
 * แต่ละแถวพก id ของตัวเองมาด้วย (planId ว่าง = แพ็กเกจใหม่)
 *
 * ต่างจากแพ็กเกจบริการที่ลบทิ้งแล้วสร้างใหม่ทั้งชุดทุกครั้ง: ที่นี่แก้ทีละแถวตาม id
 * ลิงก์ ?plan=<id> ที่ลูกค้าแชร์ต่อกันจึงไม่ตาย และคำขอเก่ายังชี้กลับมาหาแพ็กเกจเดิมได้
 */

const BILLING: BillingCycle[] = ['ONE_TIME', 'MONTHLY', 'YEARLY', 'CUSTOM']

export type PlanRow = {
  id: string | null
  nameTh: string
  nameEn: string
  price: number | null
  billing: BillingCycle
  includesTh: string[]
  includesEn: string[]
  isPopular: boolean
  buyUrl: string | null
  order: number
}

export type PlanParseResult = { rows: PlanRow[]; error: null } | { rows: null; error: string }

const lines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean)

export function plansFromForm(formData: FormData): PlanParseResult {
  const all = (key: string) => formData.getAll(key).map((value) => String(value))
  const ids = all('planId')
  const nameTh = all('planNameTh').map((value) => value.trim())
  const nameEn = all('planNameEn').map((value) => value.trim())
  const price = all('planPrice').map((value) => value.trim().replace(/,/g, ''))
  const billing = all('planBilling')
  const includesTh = all('planIncludesTh')
  const includesEn = all('planIncludesEn')
  const buyUrl = all('planBuyUrl').map((value) => value.trim())
  const popular = String(formData.get('planPopular') ?? '')

  const rows: PlanRow[] = []
  for (let index = 0; index < nameTh.length; index++) {
    const name = nameTh[index] || nameEn[index]
    // แถวว่างทั้งแถว = ช่องที่กดเพิ่มไว้แต่ไม่ได้กรอก ข้ามไปเงียบ ๆ
    if (!name) continue

    const cycle = BILLING.find((value) => value === billing[index]) ?? 'ONE_TIME'
    const rawPrice = price[index] ?? ''
    const amount = rawPrice ? Number(rawPrice) : null
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      return { rows: null, error: `ราคาของแพ็กเกจ "${name}" ต้องเป็นตัวเลขที่ไม่ติดลบ` }
    }
    const link = buyUrl[index] ?? ''
    if (link && !safeExternalUrl(link)) {
      return { rows: null, error: `ลิงก์ซื้อของแพ็กเกจ "${name}" ต้องเป็นลิงก์เต็มที่ขึ้นต้นด้วย http:// หรือ https://` }
    }

    rows.push({
      id: ids[index] || null,
      nameTh: name,
      nameEn: nameEn[index] || name,
      // แพ็กเกจสอบถามราคาไม่เก็บตัวเลข ไม่งั้นหน้าเว็บกับข้อมูลที่ส่งให้ Google จะบอกราคาไม่ตรงกัน
      price: cycle === 'CUSTOM' ? null : amount,
      billing: cycle,
      includesTh: lines(includesTh[index] ?? ''),
      includesEn: lines(includesEn[index] ?? ''),
      isPopular: String(index) === popular,
      buyUrl: link || null,
      order: rows.length + 1,
    })
  }

  return { rows, error: null }
}
