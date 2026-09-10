import { z } from 'zod'
import { resolveSiteOrigin, SITE_ORIGIN } from './site'

/**
 * ตรวจ environment variable ตอนบูตแอป แทนที่จะปล่อยให้พังกลางทางด้วย `undefined!`
 * ตอน build ใน Docker จะยังไม่มีค่าจริง จึงข้ามได้ด้วย SKIP_ENV_VALIDATION=1
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'ต้องมี DATABASE_URL ของ Railway Postgres'),

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร'),

  /**
   * จำนวน reverse proxy ที่คั่นระหว่างผู้ใช้กับแอป
   *
   * ใช้เลือกว่าจะเชื่อ x-forwarded-for ตัวไหน — ดู clientIpFrom ใน src/lib/rate-limit.ts
   * Railway ตัวเดียวคือ 1 ถ้าเอา CDN มาคั่นเพิ่มอีกชั้นต้องขยับเป็น 2
   * ตั้งผิดเป็นเลขน้อยเกินไป = เชื่อค่าที่ผู้เรียกแต่งเองได้ ตั้งมากเกินไป = ทุกคนถูกนับเป็น IP เดียว
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(1).max(5).default(1),

  // Cloudflare R2 — ไม่บังคับตอน dev ถ้ายังไม่อัปโหลดไฟล์
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.url().optional(),

  // Resend — ไม่ตั้งค่า = ฟอร์มยังบันทึกลง DB แต่ไม่ส่งอีเมล
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_TO: z.string().optional(),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default(SITE_ORIGIN),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  /**
   * รหัสยืนยันความเป็นเจ้าของเว็บใน Google Search Console
   *
   * ต้องยืนยันก่อนถึงจะเห็นว่าคนค้นด้วยคำไหนแล้วเจอเรา หน้าไหนติดอันดับ และหน้าไหนถูกปฏิเสธ
   * ซึ่งเป็นข้อมูลชุดเดียวที่บอกได้ว่างาน SEO ที่ทำไปได้ผลจริงหรือเปล่า — เดาเอาจากข้างนอกไม่ได้
   */
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),
})

const skip = process.env.SKIP_ENV_VALIDATION === '1'

/**
 * เติม https:// ให้ค่าที่กรอกมาเป็นแค่ชื่อโดเมน
 *
 * เป็นความผิดพลาดที่เกิดง่ายมากตอนก๊อปโดเมนจาก dashboard ของ Railway
 * และถ้าไม่ดักไว้ build จะล้มทั้งรอบด้วย "TypeError: Invalid URL"
 * ซึ่งอ่านแล้วเดาไม่ออกว่าต้นเหตุอยู่ที่ค่าตัวไหน
 */
function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return undefined
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function parse<T extends z.ZodType>(schema: T, source: unknown, label: string): z.infer<T> {
  if (skip) return source as z.infer<T>

  const result = schema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`ตั้งค่า ${label} ไม่ถูกต้อง:\n${issues}`)
  }
  return result.data
}

export const serverEnv = parse(
  serverSchema,
  { ...process.env, R2_PUBLIC_URL: normalizeUrl(process.env.R2_PUBLIC_URL) },
  'environment variable ฝั่งเซิร์ฟเวอร์',
)

// Next.js แทนค่า NEXT_PUBLIC_* ตอน build จึงต้องอ้างถึงแบบเต็มชื่อ ไม่ใช่ spread จาก process.env
export const clientEnv = parse(
  clientSchema,
  {
    NEXT_PUBLIC_SITE_URL: resolveSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  'environment variable ฝั่งเบราว์เซอร์',
)

export const isR2Configured = Boolean(
  serverEnv.R2_ACCOUNT_ID &&
    serverEnv.R2_ACCESS_KEY_ID &&
    serverEnv.R2_SECRET_ACCESS_KEY &&
    serverEnv.R2_BUCKET &&
    serverEnv.R2_PUBLIC_URL,
)

export const isMailConfigured = Boolean(
  serverEnv.RESEND_API_KEY && serverEnv.MAIL_FROM && serverEnv.MAIL_TO,
)
