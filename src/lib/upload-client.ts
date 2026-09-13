'use client'

import { confirmUpload, requestUpload } from '@/server/media-actions'

export type UploadResult =
  | { ok: true; url: string; width?: number; height?: number; blurData?: string }
  | { ok: false; error: string }

/** ด้านยาวสุดของภาพที่เก็บจริง — คมพอสำหรับภาพเต็มจอบนจอความละเอียดสูง */
const MAX_EDGE = 2560
/** ภาพที่เล็กกว่านี้และไม่เกินขนาดข้างบน ส่งขึ้นตามเดิมไม่ต้องแปลง */
const KEEP_BELOW_BYTES = 600 * 1024
/** ชนิดที่แปลงได้โดยไม่เสียอะไร GIF ไม่แปลงเพราะภาพเคลื่อนไหวจะหาย AVIF เล็กอยู่แล้ว */
const REENCODABLE = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * ย่อภาพก่อนอัปโหลด
 *
 * ภาพจากกล้องมักกว้างราว 6000px และหนักหลาย MB
 * ตัวย่อรูปของ Next ต้องถอดรหัสไฟล์เต็มทุกครั้งที่ย่อขนาดใหม่ บนเซิร์ฟเวอร์ขนาดเล็กภาพแบบนี้ใช้เวลาหลายวินาที
 * บางครั้งเกินเจ็ดวินาทีจนหมดเวลา ผู้เข้าชมเห็นกรอบเปล่า
 * ย่อฝั่งเบราว์เซอร์เหลือด้านยาว 2560px เป็น WebP คุณภาพสูง ไฟล์เล็กลงหลายเท่าและยังคมพอสำหรับทุกจอ
 *
 * แปลงแล้วไฟล์ใหญ่กว่าเดิม หรือเบราว์เซอร์ไม่รองรับ WebP ใช้ไฟล์เดิม
 */
async function prepareImage(file: File): Promise<File> {
  if (!REENCODABLE.has(file.type) || typeof createImageBitmap !== 'function') return file

  let bitmap: ImageBitmap
  try {
    // อ่านทิศทางจาก EXIF ด้วย ภาพถ่ายแนวตั้งจากโทรศัพท์จึงไม่กลายเป็นแนวนอน
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    if (longest <= MAX_EDGE && file.size <= KEEP_BELOW_BYTES) return file

    const scale = Math.min(1, MAX_EDGE / longest)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))

    const context = canvas.getContext('2d')
    if (!context) return file

    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    // ภาพหน้าจอ (PNG) มีตัวหนังสือเล็ก ใช้คุณภาพสูงกว่าภาพถ่ายเล็กน้อย
    const quality = file.type === 'image/png' ? 0.92 : 0.86
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file

    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`
    return new File([blob], name, { type: 'image/webp', lastModified: file.lastModified })
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}

/**
 * อ่านขนาดจริงของภาพ และย่อลงเหลือ 16px เพื่อทำ blur placeholder
 *
 * ทำฝั่งเบราว์เซอร์เพราะได้ผลลัพธ์เดียวกับการประมวลผลฝั่งเซิร์ฟเวอร์
 * แต่ไม่ต้องติดตั้ง sharp ซึ่งกินแรมและเวลา build บน Railway
 */
async function inspectImage(
  file: File,
): Promise<{ width?: number; height?: number; blurData?: string }> {
  if (!file.type.startsWith('image/')) return {}

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('อ่านไฟล์ภาพไม่ได้'))
      element.src = objectUrl
    })

    const width = image.naturalWidth
    const height = image.naturalHeight

    const targetWidth = 16
    const targetHeight = Math.max(1, Math.round((height / width) * targetWidth))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) return { width, height }

    context.drawImage(image, 0, 0, targetWidth, targetHeight)
    const blurData = canvas.toDataURL('image/jpeg', 0.5)

    // ถ้า data URL ยาวผิดปกติ แปลว่าย่อไม่สำเร็จ อย่าเก็บลงฐานข้อมูล
    return { width, height, blurData: blurData.length < 3000 ? blurData : undefined }
  } catch {
    return {}
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function uploadImage(original: File, folder = 'uploads'): Promise<UploadResult> {
  // ขนาดและชนิดที่ขอสิทธิ์ต้องเป็นของไฟล์ที่ส่งขึ้นจริง ตั๋วอัปโหลดผูกค่าทั้งสองไว้
  const file = await prepareImage(original)

  const ticket = await requestUpload({
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    folder,
  })

  if (!ticket.ok) return { ok: false, error: ticket.error }

  const meta = await inspectImage(file)

  try {
    const response = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'content-type': file.type },
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `อัปโหลดไม่สำเร็จ (${response.status}) — ตรวจการตั้งค่า CORS ของ bucket`,
      }
    }
  } catch {
    // fetch พังก่อนได้ status มักแปลว่าโดน CORS บล็อก
    return { ok: false, error: 'อัปโหลดไม่สำเร็จ — ตรวจว่า bucket อนุญาต PUT จากโดเมนนี้แล้ว' }
  }

  /**
   * ไม่ส่ง url และ folder กลับไป — เซิร์ฟเวอร์คำนวณเองจาก key ที่เซ็นไว้
   * ค่าที่ผ่านเบราว์เซอร์มาแล้วไม่ควรกลายเป็นค่าที่เชื่อได้อีกฝั่ง
   */
  const confirmed = await confirmUpload({
    key: ticket.key,
    token: ticket.token,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    ...meta,
  })

  if (!confirmed.ok) return { ok: false, error: confirmed.error }

  return { ok: true, url: ticket.publicUrl, ...meta }
}
