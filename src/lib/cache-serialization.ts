import { Prisma } from '../generated/prisma/client'

const Decimal = Prisma.Decimal

/**
 * แปลงผลจากฐานข้อมูลเป็น JSON แล้วคืนรูปเดิม โดยชนิดข้อมูลไม่เพี้ยน
 *
 * แคชข้อมูลของ Next เก็บค่าเป็น JSON ซึ่งไม่มีทั้ง Date และ Decimal
 * ถ้าเก็บตรง ๆ วันที่จะกลับมาเป็นข้อความ (เรียก .toISOString() ต่อไม่ได้)
 * และราคาจะกลับมาเป็นข้อความแทน Decimal ที่โค้ดส่วนอื่นคาดไว้
 */

type PackedDate = { $date: string }
type PackedDecimal = { $decimal: string }

export function packForCache(value: unknown): unknown {
  if (value instanceof Date) return { $date: value.toISOString() } satisfies PackedDate
  if (value instanceof Decimal) return { $decimal: value.toString() } satisfies PackedDecimal
  if (Array.isArray(value)) return value.map(packForCache)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, packForCache(item)]))
  }
  return value
}

export function unpackFromCache(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unpackFromCache)
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    if (keys.length === 1 && typeof record.$date === 'string') return new Date(record.$date)
    if (keys.length === 1 && typeof record.$decimal === 'string') return new Decimal(record.$decimal)
    return Object.fromEntries(keys.map((key) => [key, unpackFromCache(record[key])]))
  }
  return value
}
