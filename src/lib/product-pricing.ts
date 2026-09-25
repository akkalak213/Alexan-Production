import type { BillingCycle } from '@/generated/prisma/enums'
import { formatPrice, toNumber } from './format'

/**
 * ราคาของแพ็กเกจผลิตภัณฑ์ — ที่เดียวที่แปลงราคากับรอบการคิดเงินเป็นข้อความ
 *
 * หน้าเว็บ ข้อความที่บันทึกลงคำขอของลูกค้า และรายการในใบเสนอราคาเรียกจากที่นี่ทั้งหมด
 * ลูกค้าเห็น "฿490 ต่อเดือน" บนหน้าเว็บ ทีมขายก็เห็นข้อความเดียวกันในคำขอ ไม่มีทางเขียนไม่ตรงกัน
 */

type Locale = 'th' | 'en'

export type PlanPrice = { price: unknown; billing: BillingCycle }

const billingLabel: Record<Locale, Record<BillingCycle, string>> = {
  th: { ONE_TIME: 'ซื้อขาด', MONTHLY: 'ต่อเดือน', YEARLY: 'ต่อปี', CUSTOM: '' },
  en: { ONE_TIME: 'one-time', MONTHLY: 'per month', YEARLY: 'per year', CUSTOM: '' },
}

const onRequest: Record<Locale, string> = { th: 'สอบถามราคา', en: 'Price on request' }

/** หน่วยในใบเสนอราคา — แพ็กเกจรายเดือนคิดเป็นเดือน ซื้อขาดคิดเป็นชุด */
const quoteUnit: Record<Locale, Record<BillingCycle, string>> = {
  th: { ONE_TIME: 'ชุด', MONTHLY: 'เดือน', YEARLY: 'ปี', CUSTOM: 'งาน' },
  en: { ONE_TIME: 'license', MONTHLY: 'month', YEARLY: 'year', CUSTOM: 'job' },
}

const asLocale = (locale: string): Locale => (locale === 'en' ? 'en' : 'th')

/** ราคาที่มีตัวเลขจริง — CUSTOM หรือไม่กรอกราคา = สอบถามราคา */
export function planAmount(plan: PlanPrice): number | null {
  if (plan.billing === 'CUSTOM') return null
  return toNumber(plan.price)
}

/**
 * แยกเป็นสองส่วนให้หน้าเว็บจัดขนาดตัวอักษรต่างกันได้
 * amount = null คือสอบถามราคา และ unit คือข้อความ "สอบถามราคา" แทน
 */
export function planPrice(plan: PlanPrice, locale: string): { amount: string | null; unit: string } {
  const lang = asLocale(locale)
  const amount = planAmount(plan)
  if (amount === null) return { amount: null, unit: onRequest[lang] }
  return { amount: formatPrice(amount, lang), unit: billingLabel[lang][plan.billing] }
}

/** ข้อความเดียวจบ เช่น "฿490 ต่อเดือน" — ใช้เก็บลงคำขอและส่งอีเมล */
export function planPriceTag(plan: PlanPrice, locale: string): string {
  const { amount, unit } = planPrice(plan, locale)
  return amount ? [amount, unit].filter(Boolean).join(' ') : unit
}

/**
 * แพ็กเกจราคาเริ่มต้น ใช้บอก "เริ่มต้นที่" บนการ์ดและในข้อมูลสำหรับ Google
 * เลือกตัวเลขต่ำสุดในบรรดาแพ็กเกจที่มีราคา ไม่สนรอบการคิดเงิน เพราะเป็นเงินก้อนแรกที่ลูกค้าต้องจ่าย
 */
export function lowestPlan<T extends PlanPrice>(plans: T[]): T | null {
  let lowest: T | null = null
  for (const plan of plans) {
    const amount = planAmount(plan)
    if (amount === null) continue
    if (lowest === null || amount < (planAmount(lowest) ?? Infinity)) lowest = plan
  }
  return lowest
}

/** รายการตั้งต้นในใบเสนอราคาที่ออกจากคำขอผลิตภัณฑ์ — แอดมินแก้ได้ก่อนบันทึกเสมอ */
export function productQuoteLine({
  locale,
  productName,
  planName,
  plan,
}: {
  locale: string
  productName: string
  planName: string | null
  plan: PlanPrice | null
}) {
  const lang = asLocale(locale)
  const amount = plan ? planAmount(plan) : null
  return {
    description: [productName, planName].filter(Boolean).join(' · '),
    quantity: '1',
    unit: quoteUnit[lang][plan?.billing ?? 'CUSTOM'],
    unitPrice: amount === null ? '' : String(amount),
  }
}
