import { headers } from 'next/headers'

/**
 * nonce ของคำขอปัจจุบัน — src/proxy.ts เป็นคนสุ่มและแนบมากับ header ของคำขอ
 *
 * สคริปต์ที่เราแทรกเองในหน้า (ตัวตั้งธีมของ next-themes, gtag) ต้องพก nonce นี้ไปด้วย
 * ไม่งั้น CSP จะบล็อกทิ้ง ส่วนสคริปต์ของ Next เองไม่ต้องทำอะไร — Next อ่าน nonce
 * จากหัวข้อ Content-Security-Policy ของคำขอแล้วแปะให้ทุกแท็กเอง
 *
 * การเรียกฟังก์ชันนี้ทำให้หน้ากลายเป็น dynamic ซึ่งจำเป็น ไม่ใช่ผลข้างเคียงที่ยอมรับ:
 * HTML ที่ prerender ไว้ตอน build จะมี nonce ของตอนนั้นค้างอยู่ ไม่มีทางตรงกับค่าที่สุ่มใหม่ทุกคำขอ
 * เบราว์เซอร์จะบล็อกสคริปต์ทั้งหน้าแล้วหน้านั้นจะไม่ทำงานเลย
 */
export async function getNonce(): Promise<string | undefined> {
  return (await headers()).get('x-nonce') ?? undefined
}
