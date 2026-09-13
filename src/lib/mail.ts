import { Resend } from 'resend'
import { isMailConfigured, serverEnv } from './env'

/**
 * อีเมลเป็นส่วนเสริม ไม่ใช่ส่วนบังคับ
 * ถ้ายังไม่ได้ตั้ง RESEND_API_KEY ฟอร์มยังบันทึกลงฐานข้อมูลตามปกติ แค่ไม่มีเมลแจ้งเตือน
 * ทีมยังเห็นคำขอทั้งหมดได้จากกล่อง lead ในหน้า /admin
 */

// ชิ้นส่วน HTML ย้ายไปอยู่ที่ email-html.ts แล้ว ส่งต่อไว้ให้โค้ดเดิมที่ import จากไฟล์นี้
export { emailShell, escapeHtml, renderRows } from './email-html'

const resend = isMailConfigured ? new Resend(serverEnv.RESEND_API_KEY) : null

type SendArgs = {
  subject: string
  html: string
  replyTo?: string
}

export type MailResult = { sent: true } | { sent: false; reason: string }

/**
 * ส่งอีเมลออกไปหาปลายทางที่ระบุ
 *
 * ต่างจาก sendInternalNotification ตรงที่ตัวนี้ "บอกได้ว่าทำไมไม่สำเร็จ"
 * เพราะการส่งใบเสนอราคาให้ลูกค้าเป็นสิ่งที่แอดมินกดเองและต้องรู้ผลทันที
 * ต่างจากเมลแจ้งเตือนภายในที่ล้มเงียบ ๆ ได้โดยไม่กระทบใคร
 */
export async function sendMail(to: string, { subject, html, replyTo }: SendArgs): Promise<MailResult> {
  if (!resend) {
    return { sent: false, reason: 'ยังไม่ได้ตั้งค่า Resend (RESEND_API_KEY, MAIL_FROM, MAIL_TO)' }
  }

  try {
    const { error } = await resend.emails.send({
      from: serverEnv.MAIL_FROM!,
      to,
      subject,
      html,
      replyTo,
    })

    if (error) {
      console.error('[mail] Resend ปฏิเสธคำขอ', error)
      return { sent: false, reason: error.message || 'ผู้ให้บริการอีเมลปฏิเสธคำขอ' }
    }

    return { sent: true }
  } catch (error) {
    console.error('[mail] ส่งอีเมลไม่สำเร็จ', error)
    return { sent: false, reason: 'ติดต่อผู้ให้บริการอีเมลไม่ได้' }
  }
}

export async function sendInternalNotification({ subject, html, replyTo }: SendArgs) {
  if (!resend) {
    console.info('[mail] ข้ามการส่งอีเมล — ยังไม่ได้ตั้งค่า Resend')
    return { sent: false as const }
  }

  // ส่งเมลแจ้งเตือนไม่สำเร็จต้องไม่ทำให้ลูกค้าเห็นหน้า error ทั้งที่ข้อมูลบันทึกแล้ว
  const result = await sendMail(serverEnv.MAIL_TO!, { subject, html, replyTo })
  return { sent: result.sent }
}
