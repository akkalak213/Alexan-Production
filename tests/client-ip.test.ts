import assert from 'node:assert/strict'
import test from 'node:test'
import { pickClientIp, pickFromForwardedFor } from '../src/lib/client-ip'

/**
 * เพดานกันสแปมของฟอร์มสาธารณะและเพดานการเดารหัสผ่านของหลังบ้าน นับจากค่าที่ฟังก์ชันนี้คืน
 * พลาดได้สองทางและแย่ทั้งคู่:
 *   เลือกค่าที่ผู้เรียกแต่งเองได้ → ใครก็ยิงได้ไม่จำกัด
 *   เลือกค่าที่ทุกคนใช้ร่วมกัน (เช่น IP ของ edge Cloudflare) → คนที่หกของชั่วโมงส่งฟอร์มไม่ได้
 */

const HOPS = { hops: 1 }

// ─────────── ปลายทางจริง: ผู้ใช้ → Cloudflare → Railway ───────────

test('เชื่อ cf-connecting-ip ก่อน เพราะ Cloudflare เขียนทับค่าที่ผู้เรียกแนบมาเสมอ', () => {
  const seen = pickClientIp(
    {
      cfConnectingIp: '203.0.113.9',
      // สายนี้ลงท้ายด้วย IP ของ edge Cloudflare ซึ่งผู้เข้าชมทุกคนใช้ร่วมกัน
      forwardedFor: '203.0.113.9, 172.67.145.97',
      realIp: '172.67.145.97',
    },
    HOPS,
  )

  assert.equal(seen, '203.0.113.9')
})

test('คนละคนที่มาจาก edge Cloudflare ตัวเดียวกัน ต้องไม่ถูกนับเป็นคนเดียวกัน', () => {
  const edge = '172.67.145.97'
  const a = pickClientIp({ cfConnectingIp: '203.0.113.9', forwardedFor: `x, ${edge}` }, HOPS)
  const b = pickClientIp({ cfConnectingIp: '198.51.100.4', forwardedFor: `x, ${edge}` }, HOPS)

  assert.notEqual(a, b)
})

test('ค่าที่ผู้เรียกแต่งใส่ x-forwarded-for ถูกข้ามเมื่อมี cf-connecting-ip', () => {
  const seen = pickClientIp(
    { cfConnectingIp: '203.0.113.9', forwardedFor: 'evil, evil, 203.0.113.9, 172.67.145.97' },
    HOPS,
  )

  assert.equal(seen, '203.0.113.9')
})

// ─────────── ถ้าวันหนึ่งถอด Cloudflare ออก เหลือ Railway ล้วน ๆ ───────────

test('ไม่มี cf-connecting-ip ให้ตกไปนับ x-forwarded-for จากท้าย', () => {
  assert.equal(pickClientIp({ forwardedFor: '1.1.1.1, 203.0.113.9' }, HOPS), '203.0.113.9')
  assert.equal(pickClientIp({ forwardedFor: '203.0.113.9' }, HOPS), '203.0.113.9')
})

test('คนเดิมที่สุ่มหัวสายใหม่ทุกครั้ง ยังถูกนับเป็นคนเดียวกัน', () => {
  const first = pickClientIp({ forwardedFor: '9.9.9.9, 203.0.113.9' }, HOPS)
  const second = pickClientIp({ forwardedFor: '7.7.7.7, 203.0.113.9' }, HOPS)

  assert.equal(first, second)
})

test('ไม่มีหัวข้อของ proxy เลย ให้ใช้ x-real-ip', () => {
  assert.equal(pickClientIp({ realIp: '203.0.113.9' }, HOPS), '203.0.113.9')
})

test('ไม่มีอะไรให้ใช้เลย คืน null ให้ผู้เรียกไปตัดสินใจต่อ', () => {
  assert.equal(pickClientIp({}, HOPS), null)
  assert.equal(pickClientIp({ cfConnectingIp: '  ', forwardedFor: ',,,', realIp: '' }, HOPS), null)
  // proxy บางตัวเขียนคำว่า unknown มาแทนที่จะไม่เขียนเลย ต้องไม่กลายเป็น "คน" คนหนึ่ง
  assert.equal(pickClientIp({ forwardedFor: 'unknown', realIp: 'unknown' }, HOPS), null)
})

// ─────────── ตัวนับชั้นของ x-forwarded-for ───────────

test('มี proxy สองชั้นก็นับถอยหลังสองตัว', () => {
  assert.equal(pickFromForwardedFor('evil, 203.0.113.9, 10.0.0.1', 2), '203.0.113.9')
})

test('สายสั้นกว่าที่ตั้งไว้ ให้ถอยไปใช้ตัวแรกที่มี ไม่ใช่คืนค่าว่าง', () => {
  assert.equal(pickFromForwardedFor('203.0.113.9', 3), '203.0.113.9')
})

test('ค่า hops ที่ผิดรูปต้องไม่ทำให้เลือกค่าที่แต่งมาเอง', () => {
  for (const hops of [0, Number.NaN, -5]) {
    assert.equal(pickFromForwardedFor('evil, 203.0.113.9', hops), '203.0.113.9', `hops=${hops}`)
  }
})
