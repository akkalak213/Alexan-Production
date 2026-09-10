import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest, type NextFetchEvent } from 'next/server'
import { SITE_ORIGIN } from '../src/lib/site'

// proxy สร้าง Auth.js ตั้งแต่ตอน import ถ้าไม่มี AUTH_SECRET จะโยนทิ้งก่อนเทสต์ได้เริ่ม
process.env.AUTH_SECRET ??= 'secret-for-proxy-scope-test-only'

// Next ไม่ได้เปิดให้สร้าง NextFetchEvent เอง แต่ขา /admin ใช้แค่ส่งต่อ ไม่ได้เรียกอะไรจากมัน
const fakeEvent = { waitUntil: () => {} } as unknown as NextFetchEvent

let loaded: Promise<typeof import('../src/proxy')> | undefined

async function run(path: string) {
  const { default: proxy } = await (loaded ??= import('../src/proxy'))
  return proxy(new NextRequest(`${SITE_ORIGIN}${path}`), fakeEvent)
}

const authCookiesOf = (result: Awaited<ReturnType<typeof run>>) =>
  (result?.headers.getSetCookie() ?? []).filter((cookie) => cookie.includes('authjs'))

test('หลังบ้านที่ยังไม่ล็อกอินถูกส่งไปหน้าล็อกอิน และจำปลายทางเดิมไว้', async () => {
  const result = await run('/admin/leads')

  assert.equal(result?.status, 307)
  assert.equal(result?.headers.get('location'), `${SITE_ORIGIN}/admin/login?next=%2Fadmin%2Fleads`)
})

test('/admin ตรงตัวก็ยังเข้าด่านล็อกอินตามเดิม', async () => {
  const result = await run('/admin')

  assert.equal(result?.status, 307)
  assert.equal(result?.headers.get('location'), `${SITE_ORIGIN}/admin/login?next=%2Fadmin`)
})

test('เส้นทางที่แค่ขึ้นต้นคล้าย /admin ไม่ถูกนับเป็นหลังบ้าน', async () => {
  // /administrator เป็นเส้นทางเว็บธรรมดา ต้องตกไปที่ next-intl ไม่ใช่ด่านล็อกอิน
  const result = await run('/administrator')

  assert.notEqual(result?.headers.get('location'), `${SITE_ORIGIN}/admin/login?next=%2Fadministrator`)
  assert.deepEqual(authCookiesOf(result), [])
})

test('หน้าสาธารณะไม่ติด cookie ของ Auth.js กลับไปด้วย', async () => {
  for (const path of ['/', '/en', '/work', '/en/rental']) {
    const result = await run(path)

    assert.deepEqual(authCookiesOf(result), [], `${path} ไม่ควรตั้ง cookie ของ Auth.js`)
  }
})
