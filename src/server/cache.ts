import { unstable_cache } from 'next/cache'
import { packForCache, unpackFromCache } from '@/lib/cache-serialization'

/**
 * แคชข้อมูลหน้าเว็บสาธารณะข้ามคำขอ
 *
 * หน้าเว็บทุกหน้าต้องเรนเดอร์ใหม่ทุกคำขอ เพราะ CSP สุ่ม nonce ใหม่ทุกครั้ง (ดู proxy.ts)
 * แต่ข้อมูลในหน้าไม่ได้เปลี่ยนทุกคำขอ — เดิมการเปิดหนึ่งหน้ายิงฐานข้อมูลใหม่ทั้งชุด
 * ตอนนี้เก็บผลไว้ แล้วล้างทันทีด้วย updateTag เมื่อหลังบ้านบันทึกข้อมูลกลุ่มนั้น
 * คนแก้ข้อมูลเห็นผลบนหน้าเว็บทันที ส่วนผู้เข้าชมไม่ต้องรอฐานข้อมูลทุกครั้ง
 *
 * revalidate สำรองไว้หนึ่งชั่วโมง เผื่อมีการแก้ฐานข้อมูลตรง ๆ โดยไม่ผ่านหลังบ้าน (เช่นสคริปต์ seed)
 * error ไม่ถูกเก็บลงแคช ฐานข้อมูลสะดุดครั้งเดียวจึงไม่ค้างเป็นหน้าเสียไปทั้งชั่วโมง
 */

export type CacheTag = 'services' | 'projects' | 'equipment' | 'reviews' | 'posts' | 'team' | 'settings'

export function cachedQuery<Args extends unknown[], Result>(
  key: string,
  tags: CacheTag[],
  run: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  const stored = unstable_cache(async (...args: Args) => packForCache(await run(...args)), ['public-data', key], {
    tags,
    revalidate: 3600,
  })

  return async (...args: Args) => unpackFromCache(await stored(...args)) as Result
}
