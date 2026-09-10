import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { STATIC_SECURITY_HEADERS } from './src/lib/security-headers'

/**
 * ดึงเฉพาะชื่อโฮสต์จาก R2_PUBLIC_URL
 * รับได้ทั้งแบบมีและไม่มี https:// นำหน้า และไม่ทำให้ build ล้มถ้าค่าผิดรูป
 */
function hostnameOf(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`

  try {
    return new URL(withProtocol).hostname
  } catch {
    console.warn(`[next.config] R2_PUBLIC_URL ไม่ถูกรูปแบบ จึงข้ามไป: ${value}`)
    return null
  }
}

const r2Host = hostnameOf(process.env.R2_PUBLIC_URL)

const nextConfig: NextConfig = {
  // Railway รันเป็น container — standalone ตัดขนาด image ลงเหลือเฉพาะไฟล์ที่ใช้จริง
  // ปิดบน Windows เพราะ chunk บางไฟล์มี ':' ในชื่อ (node:buffer) ซึ่งเป็นอักขระต้องห้ามของ NTFS
  // ทำให้ขั้นตอน copy ของ standalone ล้มเหลว — บน Linux ใน Docker ไม่มีปัญหานี้
  output: process.platform === 'win32' ? undefined : 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,

  experimental: {
    serverActions: {
      /**
       * เพดานขนาดข้อมูลที่ยิงเข้า server action ได้
       *
       * ไฟล์ทั้งหมดอัปโหลดตรงเข้า R2 ไม่ผ่านเซิร์ฟเวอร์ Next อยู่แล้ว
       * ที่วิ่งผ่าน action จึงมีแต่ข้อความจากฟอร์ม — ค่าเริ่มต้น 1MB ยังมากเกินความจำเป็น
       * ตั้งให้พอดีกับของจริงเพื่อไม่ให้ใครยิงข้อมูลก้อนโตซ้ำ ๆ จนหน่วยความจำของ container หมด
       */
      bodySizeLimit: '512kb',
    },
  },

  images: {
    remotePatterns: [
      // ปลายทางจริงของรูปทั้งหมดหลังขึ้น production
      ...(r2Host ? [{ protocol: 'https' as const, hostname: r2Host }] : []),
      // placeholder ที่ seed ใช้ — ลบออกได้เมื่อเปลี่ยนเป็นรูปงานจริงครบแล้ว
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      // thumbnail ของ YouTube สำหรับผลงานวิดีโอ
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    /**
     * SVG ที่ผ่าน image optimizer จะถูกเสิร์ฟกลับมาจากโดเมนเรา
     * ไฟล์ SVG รันสคริปต์ได้ ถ้าเปิดไว้ก็เท่ากับให้ใครก็ได้ฝากสคริปต์ไว้บนโดเมนเดียวกับเว็บ
     * ค่านี้ปิดอยู่แล้วโดยปริยาย แต่เขียนไว้ให้เห็นชัดว่าเป็นการตัดสินใจ ไม่ใช่ความบังเอิญ
     */
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },

  /**
   * หัวข้อความปลอดภัยชั้นพื้นฐาน
   *
   * ตัว CSP ที่มี nonce ออกจาก src/proxy.ts เพราะต้องสุ่มใหม่ทุกคำขอ
   * แต่ proxy ไม่ได้ครอบ /api และไฟล์ static (ดู matcher) จึงต้องมีชั้นนี้ปิดส่วนที่เหลือ
   * ทั้งสองที่อ่านค่าจากตัวแปรเดียวกันใน src/lib/security-headers.ts จะได้ไม่หลุดกันคนละทาง
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: Object.entries(STATIC_SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
      },
      {
        // route handler ไม่ได้เรนเดอร์หน้าเว็บ จึงไม่ต้องการแหล่งข้อมูลภายนอกเลยสักอย่าง
        source: '/api/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" },
        ],
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(nextConfig)
