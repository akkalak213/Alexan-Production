import { auth } from '@/auth'
import { db } from '@/lib/db'
import { safeExternalUrl } from '@/lib/external-link'
import type { UserRole } from '@/generated/prisma/enums'

/**
 * ตัวช่วยที่ใช้ร่วมกันในทุก action ของ CMS
 * แยกออกจากไฟล์ 'use server' เพราะไฟล์นั้น export ได้เฉพาะ async function
 */

export type ActiveUser = { id: string; email: string; name: string; role: UserRole }

/**
 * ผู้ใช้ที่ล็อกอินอยู่และยังใช้งานได้จริง — คืน null ถ้าไม่ผ่าน
 *
 * ต้องอ่านจากฐานข้อมูล ไม่ใช่เชื่อค่าใน session token เพียงอย่างเดียว
 * เพราะ token เป็น JWT ที่ลงนามไว้แล้วมีอายุ 8 ชั่วโมง — ปิดบัญชีหรือลดสิทธิ์คนคนหนึ่งไปแล้ว
 * เขายังถือ token ใบเดิมที่บอกว่าเป็น ADMIN เข้ามาสั่งงานได้จนกว่าจะหมดอายุ
 * ซึ่งเป็นช่วงเวลาที่ยาวเกินไปสำหรับกรณีที่อยากตัดสิทธิ์ทันที (เช่น คนออกจากทีม)
 *
 * ค่าที่คืนกลับใช้ role จากฐานข้อมูลเสมอ ไม่ใช่จาก token
 */
export async function getActiveUser(): Promise<ActiveUser | null> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  if (!user?.isActive) return null

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export async function requireEditor(): Promise<ActiveUser> {
  const user = await getActiveUser()
  if (!user) throw new Error('ไม่ได้รับอนุญาต')
  return user
}

export async function requireAdmin(): Promise<ActiveUser> {
  const user = await requireEditor()
  if (user.role !== 'ADMIN') throw new Error('ต้องเป็นผู้ดูแลระบบเท่านั้น')
  return user
}

/**
 * กันการบันทึกทับข้อมูลที่ใหม่กว่า (optimistic concurrency)
 *
 * ฟอร์มแก้ไขทุกใบพก "เวลาแก้ล่าสุด" ของระเบียนที่ตัวเองเรนเดอร์มาด้วยเสมอ
 * ถ้าค่าที่ส่งกลับมาไม่ตรงกับในฐานข้อมูล แปลว่าหน้าที่กำลังกรอกอยู่เป็นภาพเก่า
 * (เปิดค้างไว้สองแท็บ กดปุ่มย้อนกลับ หรือมีคนอื่นแก้ไปแล้ว) — ต้องไม่ยอมให้เขียนทับ
 */
export const STALE_WRITE_MESSAGE =
  'ข้อมูลชุดนี้ถูกแก้ไปแล้วหลังจากเปิดหน้านี้ กดรีเฟรชหน้าเพื่อดึงของล่าสุดก่อนบันทึกอีกครั้ง ไม่งั้นของใหม่จะถูกเขียนทับ'

/** แปลงเป็นข้อความรูปแบบเดียวกันทั้งฝั่งที่เขียนลงฟอร์มและฝั่งที่เทียบค่า */
export function versionOf(value: Date | string | null | undefined): string {
  if (!value) return ''
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

/**
 * ฟอร์มเก่ากว่าฐานข้อมูลหรือไม่
 *
 * ฟอร์มที่ไม่ได้ส่งค่ามาถือว่าผ่าน (ฟอร์มสร้างใหม่ยังไม่มีระเบียนให้เทียบ)
 * current เป็นได้ทั้ง Date (เวลาแก้ล่าสุด) และข้อความ (ลายเซ็นของชุดข้อมูล เช่น รายการแพ็กเกจ)
 */
export function isStaleWrite(
  submitted: string,
  current: Date | string | null | undefined,
): boolean {
  if (!submitted || current === null || current === undefined) return false
  return submitted !== (current instanceof Date ? versionOf(current) : current)
}

/**
 * ลายเซ็นของรายการที่ถูกลบแล้วสร้างใหม่ทั้งชุดทุกครั้งที่บันทึก (เช่น แพ็กเกจของบริการ)
 * id เปลี่ยนยกชุดทุกครั้ง จึงใช้แทน "เวอร์ชัน" ของรายการได้
 *
 * รายการว่างต้องไม่คืนข้อความว่าง ไม่งั้น isStaleWrite จะมองว่าฟอร์มไม่ได้ส่งค่ามาแล้วปล่อยผ่าน
 * ซึ่งจะเปิดช่องให้หน้าที่เห็นว่า "ยังไม่มีแพ็กเกจ" ไปลบทับของที่คนอื่นเพิ่งเพิ่มไว้
 */
export function listSignature(ids: string[]): string {
  return ids.length ? ids.join(',') : 'empty'
}

/** ช่องข้อความว่างควรเก็บเป็น null ไม่ใช่ '' เพื่อให้เช็คเงื่อนไขในหน้าเว็บง่าย */
export function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

export function optionalText(formData: FormData, key: string): string | null {
  return text(formData, key) || null
}

export function number(formData: FormData, key: string): number | null {
  const raw = text(formData, key)
  if (!raw) return null
  const parsed = Number(raw.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function integer(formData: FormData, key: string, fallback = 0): number {
  const parsed = number(formData, key)
  return parsed === null ? fallback : Math.trunc(parsed)
}

export function boolean(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true'
}

/**
 * ช่องที่กรอกลิงก์มาแต่ใช้เป็นลิงก์ไม่ได้ — คืนป้ายกำกับของช่องนั้นเพื่อเอาไปบอกผู้ใช้
 *
 * ค่าพวกนี้จบลงที่ href บนหน้าเว็บสาธารณะ ถ้าปล่อยให้บันทึก `javascript:` ลงฐานข้อมูลได้
 * จะกลายเป็นสคริปต์ที่รันในเบราว์เซอร์ของผู้เข้าชม — ด่านตอนเรนเดอร์กรองอีกชั้นอยู่แล้ว
 * แต่การกันตั้งแต่ตอนบันทึกทำให้คนกรอกรู้ทันทีว่าพิมพ์ผิด แทนที่จะกดบันทึกสำเร็จ
 * แล้วไปงงทีหลังว่าทำไมลิงก์หายไปจากหน้าเว็บเฉย ๆ
 *
 * ช่องว่างถือว่าผ่าน (ไม่บังคับกรอก) ตรวจเฉพาะค่าที่พิมพ์อะไรมาแล้ว
 */
export function invalidUrlFields(formData: FormData, fields: Record<string, string>): string[] {
  return Object.entries(fields)
    .filter(([key]) => {
      const raw = text(formData, key)
      return Boolean(raw) && safeExternalUrl(raw) === null
    })
    .map(([, label]) => label)
}

export const URL_FIELD_MESSAGE = 'ต้องเป็นลิงก์เต็มที่ขึ้นต้นด้วย http:// หรือ https://'

/** input ชื่อซ้ำกันหลายช่อง → อาเรย์ที่ตัดค่าว่างออกแล้ว */
export function list(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean)
}

/** จับคู่ input สองชุดตามลำดับ แล้วทิ้งแถวที่กรอกไม่ครบ */
export function pairs(
  formData: FormData,
  name: string,
  keyField: string,
  valueField: string,
): Record<string, string>[] {
  const keys = formData.getAll(`${name}Key`).map((v) => String(v).trim())
  const values = formData.getAll(`${name}Value`).map((v) => String(v).trim())

  return keys
    .map((key, index) => ({ key, value: values[index] ?? '' }))
    .filter((row) => row.key && row.value)
    .map((row) => ({ [keyField]: row.key, [valueField]: row.value }))
}

/** อ่าน JSON จากฐานข้อมูลกลับมาเป็นรูปแบบที่ PairInput ใช้ได้ */
export function toPairRows(
  value: unknown,
  keyField: string,
  valueField: string,
): { key: string; value: string }[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row) => ({
      key: String(row[keyField] ?? ''),
      value: String(row[valueField] ?? ''),
    }))
    .filter((row) => row.key || row.value)
}

/** slug จากข้อความ — รองรับทั้งอังกฤษและไทย (ไทยจะเก็บอักขระไว้ตามเดิม) */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * วันสิ้นสุดการยืนราคาเริ่มต้น นับจากวันนี้
 *
 * แยกออกมาจากตัว component เพราะอ่านเวลาปัจจุบัน ซึ่งเป็นการเรียกฟังก์ชันที่ไม่บริสุทธิ์
 * ในหน้า server component ที่เรนเดอร์ใหม่ทุก request แบบนี้ถือว่าตั้งใจ
 */
export function defaultValidUntil(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}
