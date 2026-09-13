import assert from 'node:assert/strict'
import test from 'node:test'
import { bangkokYearMonth, startOfBangkokMonth } from '../src/lib/bangkok-time'
import { documentPrefix, nextDocumentNumber, withUniqueRetry } from '../src/server/document-numbers'

test('เลขถัดไปต่อจากลำดับสูงสุด ไม่ใช่จากจำนวนเอกสาร', () => {
  // ลบ 0002 ไปแล้ว — นับจำนวนได้ 3 แต่เลขถัดไปต้องเป็น 0008 ไม่ใช่ 0004
  const used = ['QT-2609-0001', 'QT-2609-0007', 'QT-2609-0003']
  assert.equal(nextDocumentNumber('QT-2609', used), 'QT-2609-0008')
  assert.equal(nextDocumentNumber('QT-2609', used, 1), 'QT-2609-0009')
  assert.equal(nextDocumentNumber('QT-2609', []), 'QT-2609-0001')
})

test('เลขรูปแบบอื่นไม่ทำให้ลำดับกระโดด', () => {
  // เลขสำรองจากเวลาที่ระบบรุ่นก่อนใช้ตอนชนกันหลายรอบ
  assert.equal(nextDocumentNumber('AX-2609', ['AX-2609-0004', 'AX-2609-123456', 'AX-2608-0099']), 'AX-2609-0005')
})

test('รหัสเดือนตามเวลาไทย ไม่ใช่เวลาเซิร์ฟเวอร์', () => {
  // 18:00 UTC วันที่ 31 ส.ค. = 01:00 น. วันที่ 1 ก.ย. ที่ไทย
  const earlySeptemberInThailand = new Date('2026-08-31T18:00:00Z')
  assert.deepEqual(bangkokYearMonth(earlySeptemberInThailand), { year: '26', month: '09' })
  assert.equal(documentPrefix('QT', earlySeptemberInThailand), 'QT-2609')

  assert.equal(startOfBangkokMonth(new Date('2026-09-15T00:00:00Z')).toISOString(), '2026-08-31T17:00:00.000Z')
  assert.equal(startOfBangkokMonth(earlySeptemberInThailand).toISOString(), '2026-08-31T17:00:00.000Z')
})

test('ลองใหม่เฉพาะเมื่อชน unique index และหยุดเมื่อครบจำนวนครั้ง', async () => {
  const collision = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })

  const attempts: number[] = []
  const result = await withUniqueRetry(async (attempt) => {
    attempts.push(attempt)
    if (attempt < 2) throw collision
    return 'saved'
  })
  assert.equal(result, 'saved')
  assert.deepEqual(attempts, [0, 1, 2])

  await assert.rejects(
    withUniqueRetry(async () => {
      throw new Error('connection lost')
    }),
    /connection lost/,
  )

  let calls = 0
  await assert.rejects(
    withUniqueRetry(async () => {
      calls++
      throw collision
    }, 3),
  )
  assert.equal(calls, 3)
})
