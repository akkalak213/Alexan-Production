import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { pickClientIp } from './client-ip'
import { db } from './db'
import { serverEnv } from './env'

/**
 * กันสแปมฟอร์มสาธารณะและการเดารหัสผ่านหลังบ้าน โดยนับจากฐานข้อมูล ไม่ใช่หน่วยความจำ
 * เพราะ Railway อาจรันหลาย container และ restart บ่อย — ตัวนับใน memory จะรีเซ็ตทุกครั้ง
 *
 * เราไม่เก็บ IP ดิบ เก็บเฉพาะ hash ที่ผสม AUTH_SECRET (ย้อนกลับไม่ได้)
 */

function hash(value: string): string {
  return createHash('sha256').update(`${value}:${serverEnv.AUTH_SECRET}`).digest('hex').slice(0, 32)
}

/**
 * IP ของผู้ใช้จริง
 *
 * เดิมอ่านตัวแรกของ x-forwarded-for ซึ่งเป็นค่าที่ผู้เรียกส่งมาเองได้ทั้งหมด
 * ใครก็ตามที่แนบ `X-Forwarded-For: <สุ่มใหม่ทุกครั้ง>` มากับคำขอจะได้ ipHash ใหม่ทุกครั้ง
 * แล้วเพดานการส่งฟอร์มก็ไม่มีความหมายอีกต่อไป — ตรรกะการเลือกอยู่ที่ pickClientIp
 */
export function clientIpFrom(headerList: Headers): string {
  return (
    pickClientIp(
      {
        cfConnectingIp: headerList.get('cf-connecting-ip'),
        forwardedFor: headerList.get('x-forwarded-for'),
        realIp: headerList.get('x-real-ip'),
      },
      { hops: serverEnv.TRUSTED_PROXY_HOPS },
    ) ?? 'unknown'
  )
}

export async function getClientIpHash(): Promise<string> {
  return hash(clientIpFrom(await headers()))
}

export async function getUserAgent(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('user-agent')?.slice(0, 300) ?? null
}

type Limit = { max: number; windowMs: number }

const limits = {
  review: { max: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3 รีวิวต่อวันต่อ IP
  lead: { max: 5, windowMs: 60 * 60 * 1000 }, // 5 คำขอต่อชั่วโมงต่อ IP
} satisfies Record<string, Limit>

export type RateLimitKind = keyof typeof limits

export async function isRateLimited(kind: RateLimitKind, ipHash: string): Promise<boolean> {
  const { max, windowMs } = limits[kind]
  const since = new Date(Date.now() - windowMs)

  try {
    const count =
      kind === 'review'
        ? await db.review.count({ where: { ipHash, createdAt: { gte: since } } })
        : await db.lead.count({ where: { ipHash, createdAt: { gte: since } } })

    return count >= max
  } catch (error) {
    // อ่านตัวนับไม่ได้ = ไม่บล็อก ดีกว่าปฏิเสธลูกค้าจริงเพราะฐานข้อมูลสะดุด
    console.error('[rate-limit] นับไม่สำเร็จ', error)
    return false
  }
}

// ─────────────────── การเข้าสู่ระบบของหลังบ้าน ───────────────────

/**
 * เพดานการเดารหัสผ่าน
 *
 * นับสองแกนพร้อมกัน เพราะคนร้ายเลี่ยงได้ทีละแกน:
 *   รายบัญชี — กันการยิงรหัสผ่านหลายพันตัวใส่อีเมลเดียว แม้จะสลับ IP ไปเรื่อย
 *   ราย IP   — กันการไล่รหัสยอดนิยมตัวเดียวกับทุกบัญชีในระบบจากเครื่องเดียว
 *
 * ตัวเลขตั้งจากการใช้งานจริง: ทีมมีไม่กี่คน พิมพ์ผิดติดกันเกินสิบครั้งใน 15 นาทีแปลว่าไม่ใช่คนของเรา
 * และเลือกเป็น "ชะลอชั่วคราว" ไม่ใช่ "ล็อกบัญชีถาวร" เพราะการล็อกถาวรเปิดช่องให้ใครก็ได้
 * ยิงรหัสผิดใส่อีเมลของทีมจนทุกคนเข้าระบบไม่ได้ — กลายเป็นเครื่องมือปิดเว็บเสียเอง
 */
const LOGIN_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxPerAccount: 10,
  maxPerIp: 20,
} as const

/** แยกปริภูมิจาก hash ของ IP ด้วยคำนำหน้า ค่าจากสองแกนจะได้ไม่มีทางชนกัน */
export function emailHashOf(email: string): string {
  return hash(`email:${email.trim().toLowerCase()}`)
}

export type LoginGate = { blocked: boolean; retryAfterMinutes: number }

/**
 * ยังยอมให้ลองเข้าสู่ระบบอีกไหม
 *
 * ถ้าอ่านตัวนับไม่ได้จะ "ไม่บล็อก" ด้วยเหตุผลเดียวกับฟอร์มสาธารณะ
 * ฐานข้อมูลสะดุดแล้วทีมเข้าหลังบ้านไม่ได้เลยคือความเสียหายที่แน่นอน
 * ส่วนช่องเดารหัสที่เปิดกว้างชั่วครู่ยังต้องผ่าน bcrypt ทุกครั้งอยู่ดี
 */
export async function checkLoginAllowed(
  emailHash: string,
  ipHash: string,
): Promise<LoginGate> {
  const since = new Date(Date.now() - LOGIN_LIMIT.windowMs)
  const retryAfterMinutes = Math.ceil(LOGIN_LIMIT.windowMs / 60_000)

  try {
    const [byAccount, byIp] = await Promise.all([
      db.loginAttempt.count({ where: { emailHash, success: false, createdAt: { gte: since } } }),
      db.loginAttempt.count({ where: { ipHash, success: false, createdAt: { gte: since } } }),
    ])

    const blocked = byAccount >= LOGIN_LIMIT.maxPerAccount || byIp >= LOGIN_LIMIT.maxPerIp
    return { blocked, retryAfterMinutes }
  } catch (error) {
    console.error('[rate-limit] อ่านประวัติการเข้าสู่ระบบไม่สำเร็จ', error)
    return { blocked: false, retryAfterMinutes }
  }
}

/**
 * บันทึกผลการพยายามเข้าสู่ระบบ
 *
 * เขียนทั้งครั้งที่สำเร็จและไม่สำเร็จ เพราะแถวที่สำเร็จคือหลักฐานตอนต้องสืบย้อนว่า
 * บัญชีไหนถูกเข้าถึงจากที่ไหนบ้าง ส่วนการนับเพดานสนใจเฉพาะแถวที่ล้มเหลว
 *
 * ล้างแถวที่หมดอายุแล้วเฉพาะตอนเข้าสำเร็จ จะได้ไม่ต้องมี cron แยกมาคอยดูแล
 * และคนที่ยิงรหัสผิดรัว ๆ จะไม่ได้สั่ง deleteMany ให้ฐานข้อมูลทำงานหนักตามไปด้วย
 */
export async function recordLoginAttempt(input: {
  emailHash: string
  ipHash: string
  success: boolean
}): Promise<void> {
  try {
    await db.loginAttempt.create({ data: input })

    if (!input.success) return

    // เก็บย้อนหลัง 7 วันพอสำหรับการสืบย้อน ที่เก่ากว่านั้นไม่มีใครใช้แล้ว
    const expiry = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: expiry } } })
  } catch (error) {
    // บันทึกไม่ได้ต้องไม่ทำให้ล็อกอินล้มเหลว แค่เสียความสามารถในการนับไปชั่วคราว
    console.error('[rate-limit] บันทึกการเข้าสู่ระบบไม่สำเร็จ', error)
  }
}
