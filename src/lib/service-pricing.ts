import type { PriceUnit } from '@/generated/prisma/enums'
import type { Locale } from '@/i18n/routing'
import { formatPrice } from '@/lib/format'

/** คีย์คำแปลใน namespace common ของแต่ละหน่วยราคา */
export const PRICE_UNIT_KEYS = {
  PROJECT: 'perProject',
  DAY: 'perDay',
  HALF_DAY: 'perHalfDay',
  HOUR: 'perHour',
  MONTH: 'perMonth',
  PERSON: 'perPerson',
} as const satisfies Record<Exclude<PriceUnit, 'CUSTOM'>, string>

type PriceKey = 'startingFrom' | 'customPrice' | (typeof PRICE_UNIT_KEYS)[keyof typeof PRICE_UNIT_KEYS]

export type StartingPrice = { from?: string; amount: string; unit?: string }

/**
 * ราคาเริ่มต้นของบริการจากแพ็กเกจที่ถูกที่สุด (query เรียงมาให้แล้ว)
 * แพ็กเกจที่ไม่ตั้งราคาหรือเป็นราคาประเมินตามงาน แสดงเป็นข้อความแทนตัวเลข
 */
export function startingPrice(
  pkg: { priceFrom: unknown; priceUnit: PriceUnit } | undefined,
  locale: Locale,
  t: (key: PriceKey) => string,
): StartingPrice | undefined {
  if (!pkg) return undefined
  if (pkg.priceUnit === 'CUSTOM') return { amount: t('customPrice') }
  const amount = formatPrice(pkg.priceFrom, locale)
  return amount ? { from: t('startingFrom'), amount, unit: t(PRICE_UNIT_KEYS[pkg.priceUnit]) } : { amount: t('customPrice') }
}
