import assert from 'node:assert/strict'
import test from 'node:test'
import { safeExternalUrl } from '../src/lib/external-link'

/**
 * ลิงก์โซเชียลและ LINE มาจากหน้าตั้งค่าในหลังบ้าน ไม่ใช่ค่าที่เขียนไว้ในโค้ด
 * ฟุตเตอร์เรนเดอร์ลิงก์พวกนี้ทุกหน้าของเว็บ ค่าที่หลุดการกรองจึงกระทบทั้งเว็บ ไม่ใช่หน้าเดียว
 */

test('ปล่อยผ่านเฉพาะ http และ https', () => {
  assert.equal(safeExternalUrl('https://line.me/ti/p/~alexan'), 'https://line.me/ti/p/~alexan')
  assert.equal(safeExternalUrl('http://facebook.com/alexan'), 'http://facebook.com/alexan')
  assert.equal(safeExternalUrl('  https://instagram.com/alexan  '), 'https://instagram.com/alexan')
})

test('บล็อก scheme ที่รันโค้ดได้ในเบราว์เซอร์ของผู้เข้าชม', () => {
  const dangerous = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ]

  for (const value of dangerous) {
    assert.equal(safeExternalUrl(value), null, `${value} ต้องไม่ผ่าน`)
  }
})

test('ค่าที่ไม่ใช่ URL สมบูรณ์คืน null ให้ผู้เรียกแสดงเป็นข้อความแทน', () => {
  // กรอกมาแต่ ID หรือชื่อบัญชี — ห้ามเดาแล้วปั้นเป็นลิงก์
  for (const value of ['@alexanstudio', 'alexan.studio', 'ไม่มี', '', '   ', null, undefined]) {
    assert.equal(safeExternalUrl(value), null, `${String(value)} ต้องคืน null`)
  }
})
