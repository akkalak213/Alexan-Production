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
  /**
   * เข้าคิวส่งอีเมลสรุปคำขอถึงผู้กรอกแล้ว (ตั้งค่าอีเมลขาออกไว้แล้ว)
   *
   * แค่ "เข้าคิว" ไม่ใช่ "ส่งถึงแล้ว" — อีเมลส่งใน after() หลังตอบกลับผู้กรอกไปแล้ว
   * ตอนที่ค่านี้ถึงเบราว์เซอร์จึงยังไม่มีใครรู้ผลจริง ข้อความที่แสดงต้องไม่บอกว่าส่งสำเร็จ
   */
  receiptQueued?: boolean
  fieldErrors?: Record<string, string[]>
}

export const initialActionState: ActionState = { status: 'idle' }
