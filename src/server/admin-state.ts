/** แยกจากไฟล์ 'use server' ซึ่ง export ได้เฉพาะ async function */
export type AdminActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string[]>
  /**
   * เวลาแก้ล่าสุดของระเบียนหลังบันทึกสำเร็จ (ISO string)
   *
   * ฟอร์มส่งค่านี้กลับมาในการบันทึกครั้งถัดไป ฝั่ง server จะเทียบกับของจริงในฐานข้อมูล
   * ถ้าไม่ตรงแปลว่าหน้าที่เห็นอยู่เป็นข้อมูลเก่า จะปฏิเสธการบันทึกแทนการเขียนทับ
   */
  version?: string
  /**
   * ชื่อช่องที่ทำให้บันทึกไม่ผ่าน ฟอร์มจะเปิดแท็บ เลื่อนไป และโฟกัสช่องนั้นให้
   * ข้อความผิดพลาดอยู่ท้ายฟอร์มยาว ๆ ถ้าไม่พาไปถึงช่อง คนกรอกต้องไล่หาเองว่าผิดตรงไหน
   */
  field?: string
}

export const initialAdminState: AdminActionState = { status: 'idle' }
