import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest, type NextFetchEvent } from 'next/server'
import { SITE_ORIGIN } from '../src/lib/site'

/**
 * เกณฑ์รับงานของ D01 ใน docs/design/design-handoff.md
 *
 * รายงาน critique ระบุว่า /contact เปิดแล้วได้ 404 เพราะ backslash ใน config.matcher ไม่ครบ
 * เทสต์ชุดนี้จึงตรวจสองชั้นที่แยกกันจริง ๆ ในตอนรัน
 *   1. config.matcher — ตัวตัดสินว่า Next จะเรียก proxy กับเส้นทางนั้นหรือไม่
 *   2. ตัว proxy เอง — เมื่อถูกเรียกแล้วส่งต่อไปทางไหน
 * ที่ต้องแยกเพราะการทดสอบ createMiddleware(routing) เดี่ยว ๆ ไม่ครอบทั้งสองชั้นนี้
 */

process.env.AUTH_SECRET ??= 'secret-for-routing-test-only'

const fakeEvent = { waitUntil: () => {} } as unknown as NextFetchEvent

let loaded: Promise<typeof import('../src/proxy')> | undefined
const load = () => (loaded ??= import('../src/proxy'))

async function run(path: string) {
  const { default: proxy } = await load()
  return proxy(new NextRequest(`${SITE_ORIGIN}${path}`), fakeEvent)
}

/** ปลายทางที่ Next จะเรนเดอร์จริงหลัง proxy ทำงานเสร็จ */
function destinationOf(result: Awaited<ReturnType<typeof run>>) {
  const redirect = result?.headers.get('location')
  if (redirect) return { kind: 'redirect' as const, url: new URL(redirect) }

  const rewrite = result?.headers.get('x-middleware-rewrite')
  if (rewrite) return { kind: 'rewrite' as const, url: new URL(rewrite) }

  return { kind: 'pass' as const, url: null }
}

test('config.matcher ปล่อยเส้นทางเว็บผ่าน และกันไฟล์ที่มีนามสกุลกับ API ออก', async () => {
  const { config } = await load()
  const matcher = new RegExp(`^${config.matcher[0]}$`)

  for (const path of ['/', '/contact', '/services', '/en', '/en/contact', '/th/work', '/admin']) {
    assert.equal(matcher.test(path), true, `${path} ต้องผ่าน proxy`)
  }

  // ถ้า escape ของจุดหลุดไป เส้นทางกลุ่มนี้จะโดนดึงเข้า locale routing แล้วพังทั้งกลุ่ม
  for (const path of ['/api/health', '/_next/static/chunk.js', '/logo.png', '/robots.txt']) {
    assert.equal(matcher.test(path), false, `${path} ต้องไม่ผ่าน proxy`)
  }
})

test('เส้นทางไทยที่ไม่มี prefix ถูกส่งเข้าหน้าไทย ไม่ใช่ 404', async () => {
  for (const path of ['/', '/contact', '/services', '/work']) {
    const result = await run(path)
    const destination = destinationOf(result)

    assert.equal(destination.kind, 'rewrite', `${path} ควรถูก rewrite ไม่ใช่เด้งหรือหลุด`)
    assert.equal(destination.url?.pathname, path === '/' ? '/th' : `/th${path}`)
  }
})

test('เส้นทางอังกฤษเปิดได้ตามเดิมโดยไม่ถูกเปลี่ยนเส้นทาง', async () => {
  for (const path of ['/en', '/en/contact', '/en/services']) {
    const result = await run(path)

    assert.equal(result?.headers.get('location'), null, `${path} ไม่ควรถูกเด้ง`)
    assert.equal(result?.status, 200)
  }
})

test('ลิงก์เดิมที่ขึ้นต้น /th ย้ายมาเส้นทางใหม่โดยไม่ทำ query หาย', async () => {
  const result = await run('/th/contact?package=web-starter')
  const destination = destinationOf(result)

  assert.equal(destination.kind, 'redirect')
  assert.equal(destination.url?.pathname, '/contact')
  assert.equal(destination.url?.searchParams.get('package'), 'web-starter')
})
