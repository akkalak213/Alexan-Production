/**
 * กรอง URL ภายนอกที่มาจากหลังบ้านก่อนเอาไปใส่ href
 *
 * ค่าพวกนี้ (ลิงก์โซเชียล, LINE) พิมพ์เข้ามาจากหน้าตั้งค่า ไม่ใช่ค่าที่เราเขียนไว้ในโค้ด
 * ถ้าโยนลง href ดื้อ ๆ คนที่มีสิทธิ์ EDITOR ใส่ `javascript:` หรือ `data:` แล้วกลายเป็น
 * สคริปต์ที่รันในเบราว์เซอร์ของผู้เข้าชมได้ทุกหน้า — เป็น stored XSS ที่ผ่านหน้าตั้งค่าปกติ
 *
 * อนุญาตเฉพาะ http กับ https ค่าที่ไม่เข้าเกณฑ์คืน null ให้ผู้เรียกตัดสินใจว่าจะซ่อน
 * หรือแสดงเป็นข้อความธรรมดาแทน ไม่ใช่แสดงเป็นลิงก์ที่กดแล้วไม่รู้ไปไหน
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null

  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    // ไม่ใช่ URL สมบูรณ์ เช่นกรอกมาแต่ชื่อบัญชี — ปล่อยให้ผู้เรียกแสดงเป็นข้อความ
    return null
  }
}
