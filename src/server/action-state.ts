/**
 * แยกออกมาจาก actions.ts เพราะไฟล์ที่ประกาศ 'use server'
 * export ได้เฉพาะ async function เท่านั้น — export ค่าคงที่ในนั้นจะทำให้ทั้งไฟล์พังตอนรัน
 *
 * คืนค่าเป็น "คีย์ข้อความ" ไม่ใช่ข้อความสำเร็จรูป เพื่อให้ฝั่ง client แปลตามภาษาที่ผู้ใช้เลือกเอง
 */
export type ActionState = {
  status: 'idle' | 'success' | 'error'
  messageKey?: string
  refCode?: string
  /** ส่งอีเมลสรุปคำขอถึงผู้กรอกด้วยหรือไม่ (ตั้งค่าอีเมลขาออกไว้แล้ว) */
  receiptSent?: boolean
  fieldErrors?: Record<string, string[]>
}

export const initialActionState: ActionState = { status: 'idle' }
