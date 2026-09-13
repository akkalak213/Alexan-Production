import assert from 'node:assert/strict'
import test from 'node:test'
import { Prisma } from '../src/generated/prisma/client'
import { packForCache, unpackFromCache } from '../src/lib/cache-serialization'

const Decimal = Prisma.Decimal

/**
 * แคชข้อมูลของ Next เก็บเป็น JSON ถ้าวันที่กับราคากลับมาผิดชนิด
 * หน้าเว็บจะพังตอนเรียก .toISOString() หรือแสดงราคาเป็นข้อความดิบ
 */
test('วันที่และ Decimal กลับมาเป็นชนิดเดิมหลังผ่าน JSON', () => {
  const row = {
    slug: 'camera',
    updatedAt: new Date('2026-09-13T04:20:54.070Z'),
    dailyRate: new Decimal('2000.50'),
    weeklyRate: null,
    media: [{ url: 'a.jpg', createdAt: new Date('2026-01-01T00:00:00Z') }],
    specs: [{ label: 'น้ำหนัก', value: '740g' }],
  }

  const restored = unpackFromCache(JSON.parse(JSON.stringify(packForCache(row)))) as typeof row

  assert.ok(restored.updatedAt instanceof Date)
  assert.equal(restored.updatedAt.toISOString(), '2026-09-13T04:20:54.070Z')
  assert.ok(restored.dailyRate instanceof Decimal)
  assert.equal(restored.dailyRate.toString(), '2000.5')
  assert.equal(restored.weeklyRate, null)
  assert.ok(restored.media[0].createdAt instanceof Date)
  assert.deepEqual(restored.specs, row.specs)
})
