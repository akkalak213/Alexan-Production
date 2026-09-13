import assert from 'node:assert/strict'
import test from 'node:test'
import { burnDocumentNumber, nextDocumentNumber, readBurnedNumbers } from '../src/server/document-numbers'

/** เลขใบเสนอราคาที่ลูกค้าเคยได้รับแล้วต้องไม่ถูกใช้ซ้ำหลังลบ */

test('ลบใบล่าสุดที่เคยส่งแล้ว ใบใหม่ไม่ได้เลขเดิม', () => {
  const burned = burnDocumentNumber({}, 'QT-2609-0003')
  const remaining = ['QT-2609-0001', 'QT-2609-0002']

  assert.equal(nextDocumentNumber('QT-2609', remaining), 'QT-2609-0003')
  assert.equal(nextDocumentNumber('QT-2609', [...remaining, burned['QT-2609']]), 'QT-2609-0004')
})

test('จดเลขสูงสุดต่อเดือน ลบใบเก่ากว่าทีหลังไม่ทำให้เลขถอยกลับ', () => {
  let burned = burnDocumentNumber({}, 'QT-2609-0005')
  burned = burnDocumentNumber(burned, 'QT-2609-0002')
  burned = burnDocumentNumber(burned, 'QT-2610-0001')

  assert.deepEqual(burned, { 'QT-2609': 'QT-2609-0005', 'QT-2610': 'QT-2610-0001' })
})

test('ค่าที่อ่านจากฐานข้อมูลเสียหรือไม่มี ถือว่ายังไม่มีเลขที่จดไว้', () => {
  assert.deepEqual(readBurnedNumbers(null), {})
  assert.deepEqual(readBurnedNumbers({ burned: 'x' }), {})
  assert.deepEqual(readBurnedNumbers({ burned: { 'QT-2609': 'QT-2609-0003', bad: 7 } }), { 'QT-2609': 'QT-2609-0003' })
})
