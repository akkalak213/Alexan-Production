/**
 * หัวข้อความปลอดภัยที่แนบไปกับทุก response
 *
 * ไฟล์นี้ถูก import จาก src/proxy.ts ซึ่งรันก่อนทุกคำขอ จึงตั้งใจไม่พึ่งพาอะไรเลย
 * ไม่ import env.ts (ที่ throw ตอน parse ไม่ผ่าน) และไม่อ่าน process.env
 * เพราะตอน build ใน Docker ค่าจริงยังไม่มี ถ้าเอาชื่อโฮสต์จาก env มาประกอบนโยบาย
 * ค่าที่ถูก inline ตอน build จะเป็น undefined แล้วนโยบายที่ออกไปตอนรันจะขาดโฮสต์ที่ต้องใช้
 * — บล็อกรูปและการอัปโหลดของจริงโดยไม่มีอะไรเตือน
 *
 * จึงใช้ wildcard ของ Cloudflare R2 แทนชื่อ bucket และปล่อย img-src เป็น https: ทั้งหมด
 * แหล่งรูปไม่ใช่ช่องทางรันสคริปต์ ค่าที่ต้องรัดกุมจริงคือ script-src
 */

/** ที่มาของสคริปต์ Google Analytics — โหลดเมื่อมี NEXT_PUBLIC_GA_ID เท่านั้น */
const GA_SCRIPT = 'https://www.googletagmanager.com'

/** ปลายทางที่ gtag ยิงข้อมูลกลับ */
const GA_CONNECT = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
]

/** ผู้ให้บริการวิดีโอที่ฝังในหน้าผลงาน — ตรงกับ videoEmbedUrl ใน src/lib/format.ts */
const VIDEO_FRAMES = ['https://www.youtube-nocookie.com', 'https://player.vimeo.com']

/**
 * เบราว์เซอร์ PUT ไฟล์เข้า R2 ตรง ๆ ด้วย presigned URL ไม่ผ่านเซิร์ฟเวอร์ Next
 * ถ้าไม่เปิด connect-src ให้ปลายทางนี้ การอัปโหลดในหลังบ้านจะถูก CSP บล็อกทั้งหมด
 */
const R2_ENDPOINT = 'https://*.r2.cloudflarestorage.com'

export type CspOptions = {
  /** ค่าสุ่มต่อคำขอ ใช้อนุญาตเฉพาะสคริปต์ที่เราแทรกเอง */
  nonce: string
  /** dev ต้องผ่อนกฎให้ HMR ของ Turbopack ทำงานได้ */
  isDev: boolean
}

/**
 * นโยบายแบบ strict-dynamic ตามที่ Google แนะนำ
 *
 * เบราว์เซอร์รุ่นใหม่จะเชื่อเฉพาะสคริปต์ที่มี nonce ตรงกัน แล้วส่งต่อความเชื่อนั้น
 * ให้สคริปต์ที่ตัวมันโหลดมาอีกที (เช่น gtag.js ที่ next/script แทรกให้) — รายชื่อโฮสต์จะถูกมองข้าม
 * ส่วน 'unsafe-inline' กับรายชื่อโฮสต์ใส่ไว้ให้เบราว์เซอร์รุ่นเก่าที่ไม่รู้จัก nonce
 * ซึ่งรุ่นใหม่จะไม่สนใจทั้งคู่ — เป็นการถอยหลังอย่างปลอดภัย ไม่ใช่ช่องโหว่
 */
export function buildContentSecurityPolicy({ nonce, isDev }: CspOptions): string {
  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        GA_SCRIPT,
        "'unsafe-inline'",
        // Turbopack คอมไพล์โมดูลใหม่ในเบราว์เซอร์ระหว่าง dev — ไม่มี eval แล้ว HMR ไม่ทำงาน
        ...(isDev ? ["'unsafe-eval'"] : []),
      ],
    ],
    /**
     * React เขียน style ลงบน attribute ของ element โดยตรงหลายจุด (เช่น ฉากหน้าแรก)
     * และ next/font แทรก @font-face มาเป็น style ในหน้า — ทั้งสองอย่างต้องการ 'unsafe-inline'
     * ไม่ใส่ nonce ใน style-src เพราะถ้าใส่ เบราว์เซอร์จะเลิกสน 'unsafe-inline' ทันที
     */
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', 'https:']],
    ['media-src', ["'self'", 'https:']],
    ['font-src', ["'self'", 'data:']],
    [
      'connect-src',
      [
        "'self'",
        R2_ENDPOINT,
        ...GA_CONNECT,
        // websocket ของ HMR ตอน dev
        ...(isDev ? ['ws:', 'wss:'] : []),
      ],
    ],
    ['frame-src', ["'self'", ...VIDEO_FRAMES]],
    ['worker-src', ["'self'", 'blob:']],
    ['manifest-src', ["'self'"]],
    // ไม่มีหน้าไหนของเว็บนี้ควรถูกฝังในเฟรมของคนอื่น — กัน clickjacking ที่ต้นทาง
    ['frame-ancestors', ["'none'"]],
    ['object-src', ["'none'"]],
    // ห้ามสคริปต์ที่หลุดเข้ามาย้ายฐาน URL ของหน้าเพื่อลากทรัพยากรจากที่อื่น
    ['base-uri', ["'none'"]],
    // ฟอร์มทุกใบส่งกลับมาที่เว็บนี้เท่านั้น ไม่ให้สคริปต์แปลกปลอมเปลี่ยนปลายทางไปเก็บข้อมูล
    ['form-action', ["'self'"]],
  ]

  const policy = directives.map(([name, values]) => `${name} ${values.join(' ')}`)

  // dev รันบน http://localhost — บังคับ https จะทำให้เปิดเว็บในเครื่องไม่ได้
  if (!isDev) policy.push('upgrade-insecure-requests')

  return policy.join('; ')
}

/**
 * header ที่ไม่ขึ้นกับคำขอ ตั้งครั้งเดียวใช้ได้ทุกหน้า
 *
 * ตัวที่ next.config.ts เคยตั้งไว้ย้ายมารวมที่นี่ทั้งหมด
 * เพราะ headers() ใน next.config ไม่ครอบ response ที่ proxy สร้างเอง (redirect ของหลังบ้าน)
 * แยกไว้สองที่แล้วจะมีบางเส้นทางหลุดโดยไม่มีใครสังเกต
 */
export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  // ห้ามเบราว์เซอร์เดาชนิดไฟล์เอง — ไฟล์ที่อัปโหลดมาจะได้ไม่ถูกตีความเป็น HTML
  'X-Content-Type-Options': 'nosniff',
  // frame-ancestors ครอบเบราว์เซอร์รุ่นใหม่แล้ว ตัวนี้ไว้สำหรับรุ่นเก่าที่ยังไม่รู้จัก CSP
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  // แยกหน้าต่างนี้ออกจากแท็บที่เปิดมันขึ้นมา กัน cross-window attack อย่าง XS-Leaks
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Origin-Agent-Cluster': '?1',
  // บอกเบราว์เซอร์ว่าโดเมนนี้คุยกันด้วย https เท่านั้น ครั้งต่อไปจะไม่ยิง http ออกไปให้ดักกลางทางได้
  // ยังไม่ใส่ preload เพราะถอนชื่อออกจากลิสต์ที่ฝังมากับเบราว์เซอร์ใช้เวลาเป็นเดือน ค่อยเติมเมื่อมั่นใจ
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

/**
 * หน้าหลังบ้านต้องไม่ถูกเก็บไว้ที่ไหนเลยนอกจากหน้าจอที่กำลังเปิดอยู่
 *
 * ไม่ใช่แค่เรื่อง CDN — ปุ่มย้อนกลับหลังกดออกจากระบบจะดึงหน้าเดิมจาก bfcache ขึ้นมาแสดงได้
 * ถ้าเป็นเครื่องที่ใช้ร่วมกัน คนถัดไปจะเห็นรายชื่อลูกค้าทั้งหมดทั้งที่ไม่มีสิทธิ์
 */
export const PRIVATE_PAGE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
}

/** ค่าสุ่มสำหรับ nonce — 16 ไบต์จาก CSPRNG พอสำหรับกันการเดาในคำขอเดียว */
export function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}
