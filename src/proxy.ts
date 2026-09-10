import NextAuth, { type NextAuthRequest } from 'next-auth'
import createMiddleware from 'next-intl/middleware'
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from 'next/server'
import { authConfig } from './auth.config'
import { routing } from './i18n/routing'
import {
  buildContentSecurityPolicy,
  createNonce,
  PRIVATE_PAGE_HEADERS,
  STATIC_SECURITY_HEADERS,
} from './lib/security-headers'

/**
 * proxy (เดิมชื่อ middleware — Next 16 เปลี่ยนชื่อไฟล์ตามอนุสัญญาใหม่)
 *
 * ตัวเดียวรับสามหน้าที่:
 *   ทุกคำขอ  → ออก nonce ของ CSP แล้วแนบหัวข้อความปลอดภัยกลับไปกับ response
 *   /admin/* → ตรวจว่าล็อกอินแล้วหรือยัง (หลังบ้านใช้ภาษาไทยอย่างเดียว ไม่มี prefix ภาษา)
 *   ที่เหลือ  → ให้ next-intl จัดการเปลี่ยนเส้นทางให้ไทยอยู่ที่ / และอังกฤษที่ /en
 *
 * ห่อ auth() ไว้เฉพาะขา /admin ไม่ครอบทั้งไฟล์
 * เพราะ auth() แนบ Set-Cookie ของ Auth.js (csrf-token, callback-url) ไปกับทุก response ที่มันผ่าน
 * คนที่แค่แวะเข้ามาอ่านเว็บจึงได้ cookie ที่ไม่มีอะไรใช้ติดตัวกลับไป
 *
 * (เหตุผลเรื่องแคชที่เคยเขียนไว้ตรงนี้ไม่เป็นจริงแล้ว — nonce ของ CSP เปลี่ยนทุกคำขอ
 *  ทุกหน้าจึงเรนเดอร์สดอยู่แล้ว ไม่มีหน้าไหนถูกแคชที่ CDN ให้เสียไปตั้งแต่แรก
 *  ส่วนเรื่อง cookie ที่ติดตัวกลับไปโดยไม่จำเป็นยังเป็นเหตุผลที่ใช้ได้อยู่)
 */

const intlMiddleware = createMiddleware(routing)
const { auth } = NextAuth(authConfig)

const isDev = process.env.NODE_ENV === 'development'

/**
 * auth() มี overload สองแบบที่รับ handler เหมือนกันเมื่อ handler ประกาศพารามิเตอร์เดียว
 * TypeScript จะเลือกแบบ route handler ให้ ซึ่งคืนชนิดที่เอามาใช้เป็น middleware ไม่ได้
 * ระบุชนิดของ handler ให้ครบสองพารามิเตอร์จึงบังคับให้เลือกแบบ middleware ได้
 * (next-auth ไม่ได้ export ชื่อชนิดนี้ออกมา เลยต้องเขียนไว้เอง)
 */
type AuthMiddleware = (request: NextAuthRequest, event: NextFetchEvent) => ReturnType<NextMiddleware>

const adminGate: AuthMiddleware = (request) => {
  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/admin/login'
  const isSignedIn = Boolean(request.auth)

  if (!isSignedIn && !isLoginPage) {
    const loginUrl = new URL('/admin/login', request.nextUrl.origin)
    // จำหน้าที่ตั้งใจจะไป เพื่อพากลับมาหลังล็อกอินสำเร็จ
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isSignedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/admin', request.nextUrl.origin))
  }

  return NextResponse.next()
}

const adminMiddleware = auth(adminGate)

/**
 * ส่ง header เพิ่มลงไปให้คำขอที่จะไปถึงหน้าเว็บ
 *
 * Next รับ header ที่ middleware อยากเติมผ่าน x-middleware-request-* โดยมี
 * x-middleware-override-headers เป็นสารบัญว่ามีชื่อไหนบ้าง เป็นสิ่งที่ NextResponse.next({request})
 * สร้างให้อยู่แล้วเบื้องหลัง แต่ next-intl เป็นคนสร้าง response เอง เราจึงเข้าไปต่อท้ายสารบัญนั้น
 * แทนที่จะสร้าง response ใหม่ทับของมัน (ซึ่งจะทำให้ rewrite ของภาษาหายไป)
 *
 * ถ้ายังไม่มีสารบัญ ต้องยกรายชื่อ header เดิมมาทั้งชุดก่อน ไม่งั้นคำขอปลายทาง
 * จะเหลือเฉพาะสองตัวที่เราเพิ่ม แล้ว cookie กับ host จะหายไปทั้งหมด
 */
function forwardRequestHeaders(
  response: NextResponse,
  request: NextRequest,
  extra: Record<string, string>,
) {
  const indexKey = 'x-middleware-override-headers'
  const existing = response.headers.get(indexKey)

  const names = new Set<string>()

  if (existing) {
    for (const name of existing.split(',')) {
      const trimmed = name.trim()
      if (trimmed) names.add(trimmed)
    }
  } else {
    for (const [name, value] of request.headers) {
      names.add(name)
      response.headers.set(`x-middleware-request-${name}`, value)
    }
  }

  for (const [name, value] of Object.entries(extra)) {
    const key = name.toLowerCase()
    names.add(key)
    response.headers.set(`x-middleware-request-${key}`, value)
  }

  response.headers.set(indexKey, [...names].join(','))
}

/** redirect ไม่ได้เรนเดอร์อะไร จึงไม่ต้อง (และส่งไม่ได้) ส่ง header ต่อให้หน้าปลายทาง */
function isRendering(response: NextResponse): boolean {
  return response.status < 300 || response.status >= 400
}

function applySecurity(
  response: NextResponse,
  request: NextRequest,
  options: { nonce: string; csp: string; isPrivate: boolean },
): NextResponse {
  if (isRendering(response)) {
    /**
     * ต้องส่ง CSP ไปกับตัว "คำขอ" ด้วย ไม่ใช่แค่ response
     * เพราะ Next อ่าน nonce จากหัวข้อนี้เพื่อไปแปะให้สคริปต์ที่ตัวมันแทรกเอง
     * ถ้าส่งแต่ทาง response สคริปต์ของ Next จะไม่มี nonce แล้วหน้าเว็บจะไม่ทำงานทั้งหน้า
     */
    forwardRequestHeaders(response, request, {
      'x-nonce': options.nonce,
      'content-security-policy': options.csp,
    })
  }

  response.headers.set('Content-Security-Policy', options.csp)

  for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(name, value)
  }

  if (options.isPrivate) {
    for (const [name, value] of Object.entries(PRIVATE_PAGE_HEADERS)) {
      response.headers.set(name, value)
    }
  }

  return response
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl

  const nonce = createNonce()
  const csp = buildContentSecurityPolicy({ nonce, isDev })

  // เทียบแบบเจาะจง ไม่ใช้ startsWith('/admin') เปล่า ๆ เพราะเส้นทางอย่าง /administrator จะเข้าเงื่อนไขไปด้วย
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

  const response = isAdmin
    ? await adminMiddleware(request, event)
    : await intlMiddleware(request)

  // middleware ทั้งสองตัวคืน response เสมอในทางปฏิบัติ แต่ชนิดของมันเปิดช่องให้ว่างได้
  const resolved = response ?? NextResponse.next()

  return applySecurity(resolved as NextResponse, request, { nonce, csp, isPrivate: isAdmin })
}

export const config = {
  // ข้าม API, ไฟล์ static ของ Next และไฟล์ที่มีนามสกุล
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
