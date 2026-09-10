import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildContentSecurityPolicy,
  PRIVATE_PAGE_HEADERS,
  STATIC_SECURITY_HEADERS,
} from '../src/lib/security-headers'

/**
 * CSP คือด่านสุดท้ายที่เหลืออยู่ตอนมีสคริปต์แปลกปลอมหลุดเข้าไปในหน้าเว็บได้แล้ว
 * ค่าที่ผ่อนไปทีละนิดโดยไม่มีใครสังเกตคือวิธีที่ด่านนี้หายไปตามปกติ — เทสต์นี้ล็อกไว้ไม่ให้ผ่อน
 */

function directive(policy: string, name: string): string {
  const found = policy.split('; ').find((part) => part === name || part.startsWith(`${name} `))
  assert.ok(found, `นโยบายต้องมี ${name}`)
  return found
}

test('อนุญาตสคริปต์จาก nonce ของคำขอนั้นเท่านั้น', () => {
  const policy = buildContentSecurityPolicy({ nonce: 'AbC123==', isDev: false })
  const scriptSrc = directive(policy, 'script-src')

  assert.ok(scriptSrc.includes("'nonce-AbC123=='"))
  // strict-dynamic ทำให้เบราว์เซอร์รุ่นใหม่มองข้าม 'unsafe-inline' และรายชื่อโฮสต์ที่ใส่ไว้เผื่อรุ่นเก่า
  assert.ok(scriptSrc.includes("'strict-dynamic'"))
})

test('production ต้องไม่มี unsafe-eval และต้องบังคับ https', () => {
  const policy = buildContentSecurityPolicy({ nonce: 'n', isDev: false })

  assert.ok(!policy.includes("'unsafe-eval'"), 'eval เปิดช่องให้สตริงกลายเป็นโค้ดที่รันได้')
  assert.ok(policy.includes('upgrade-insecure-requests'))
})

test('dev ผ่อนเฉพาะเท่าที่ HMR ต้องใช้ และไม่บังคับ https', () => {
  const policy = buildContentSecurityPolicy({ nonce: 'n', isDev: true })

  assert.ok(policy.includes("'unsafe-eval'"))
  assert.ok(directive(policy, 'connect-src').includes('ws:'))
  // dev รันบน http://localhost — ถ้าบังคับ https จะเปิดเว็บในเครื่องไม่ได้เลย
  assert.ok(!policy.includes('upgrade-insecure-requests'))
})

test('ปิดช่องทางที่สคริปต์แปลกปลอมใช้ต่อยอด', () => {
  const policy = buildContentSecurityPolicy({ nonce: 'n', isDev: false })

  // ไม่ให้ใครเอาหน้าเราไปซ้อนในเฟรมเพื่อหลอกให้กดผิด
  assert.equal(directive(policy, 'frame-ancestors'), "frame-ancestors 'none'")
  // ปลั๊กอินและ object ฝังตัวไม่มีที่ใช้ในเว็บนี้
  assert.equal(directive(policy, 'object-src'), "object-src 'none'")
  // ห้ามย้ายฐาน URL ของหน้าไปดึงทรัพยากรจากที่อื่น
  assert.equal(directive(policy, 'base-uri'), "base-uri 'none'")
  // ฟอร์มต้องส่งกลับมาที่เว็บนี้เท่านั้น ไม่ให้เปลี่ยนปลายทางไปเก็บข้อมูลที่อื่น
  assert.equal(directive(policy, 'form-action'), "form-action 'self'")
  assert.equal(directive(policy, 'default-src'), "default-src 'self'")
})

test('ยังเปิดทางให้สิ่งที่เว็บใช้งานจริง', () => {
  const policy = buildContentSecurityPolicy({ nonce: 'n', isDev: false })

  // เบราว์เซอร์อัปโหลดไฟล์ตรงเข้า R2 — ปิดตรงนี้แล้วหลังบ้านอัปโหลดรูปไม่ได้ทั้งระบบ
  assert.ok(directive(policy, 'connect-src').includes('https://*.r2.cloudflarestorage.com'))
  // วิดีโอในหน้าผลงานฝังจากสองเจ้านี้
  assert.ok(directive(policy, 'frame-src').includes('https://www.youtube-nocookie.com'))
  assert.ok(directive(policy, 'frame-src').includes('https://player.vimeo.com'))
})

test('nonce ที่มีอักขระพิเศษต้องไม่ทำให้นโยบายแตกเป็นคนละคำสั่ง', () => {
  // base64 มี + / = ปนได้ ถ้าเผลอมีช่องว่างหรือ ; หลุดเข้าไปจะกลายเป็น directive ใหม่
  const policy = buildContentSecurityPolicy({ nonce: 'a+b/c=', isDev: false })
  assert.ok(directive(policy, 'script-src').includes("'nonce-a+b/c='"))
})

test('หัวข้อพื้นฐานที่ต้องติดไปกับทุก response', () => {
  assert.equal(STATIC_SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff')
  assert.equal(STATIC_SECURITY_HEADERS['X-Frame-Options'], 'DENY')
  assert.ok(STATIC_SECURITY_HEADERS['Strict-Transport-Security'].includes('max-age=31536000'))
})

test('หน้าหลังบ้านต้องไม่ถูกแคชและไม่ถูกเก็บ index', () => {
  assert.ok(PRIVATE_PAGE_HEADERS['Cache-Control'].includes('no-store'))
  assert.ok(PRIVATE_PAGE_HEADERS['X-Robots-Tag'].includes('noindex'))
})
