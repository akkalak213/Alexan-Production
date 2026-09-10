'use client'

import { confirmUpload, requestUpload } from '@/server/media-actions'

export type UploadResult =
  | { ok: true; url: string; width?: number; height?: number; blurData?: string }
  | { ok: false; error: string }

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

export async function uploadImage(file: File, folder = 'uploads'): Promise<UploadResult> {
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
  await confirmUpload({
    key: ticket.key,
    token: ticket.token,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    ...meta,
  })

  return { ok: true, url: ticket.publicUrl, ...meta }
}
