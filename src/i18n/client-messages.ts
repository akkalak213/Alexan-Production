import type { AbstractIntlMessages } from 'next-intl'

/**
 * กลุ่มข้อความที่ client component ใช้จริง
 *
 * ถ้าไม่ระบุ next-intl ส่งไฟล์แปลทั้งไฟล์ติดไปกับทุกหน้า ทั้งที่ข้อความส่วนใหญ่ถูกเรนเดอร์ไปแล้วฝั่ง server
 * วัดได้ว่าเป็นครึ่งหนึ่งของ RSC payload ในหน้าแรก
 *
 * เพิ่ม client component ที่เรียก useTranslations กลุ่มใหม่ ต้องเพิ่มชื่อกลุ่มที่นี่ด้วย
 * tests/client-messages.test.ts จะฟ้องถ้าลืม
 */
export const PUBLIC_CLIENT_NAMESPACES = [
  'common',
  'nav',
  'theme',
  'locale',
  'serviceCategory',
  'rental',
  'forms',
  'work',
  'reviews',
  'estimate',
  'error',
  'budget',
] as const

/** หลังบ้านใช้ข้อความจาก next-intl เฉพาะคอมโพเนนต์ที่ใช้ร่วมกับหน้าเว็บ เช่นปุ่มสลับธีม */
export const ADMIN_CLIENT_NAMESPACES = ['theme', 'common'] as const

export function pickMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  return Object.fromEntries(
    namespaces.filter((namespace) => namespace in messages).map((namespace) => [namespace, messages[namespace]]),
  )
}
