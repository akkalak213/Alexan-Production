'use client'

import { useTranslations } from 'next-intl'

/**
 * ป้ายบอกสถานะ "กำลังโหลด" สำหรับ screen reader
 *
 * ต้องเป็น client component เพราะ loading.tsx ที่วางไว้ระดับ [locale]
 * ถูกเรนเดอร์ก่อนที่หน้าลูกจะเรียก setRequestLocale ได้ทัน
 * ถ้าเรียก getTranslations ฝั่ง server ตรงนั้น next-intl จะถอยไปเรนเดอร์แบบ dynamic
 * แล้วลาก /privacy กับ /terms ที่เป็นหน้า static หลุดจากการ prerender ไปด้วยทั้งคู่
 *
 * อ่านภาษาจาก provider ฝั่ง client แทน ได้ข้อความตรงภาษาโดยไม่กระทบการ prerender
 */
export function LoadingLabel() {
  const t = useTranslations('common')
  return <>{t('loading')}</>
}
