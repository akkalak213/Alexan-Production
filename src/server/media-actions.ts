'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isR2Configured } from '@/lib/env'
import {
  ALLOWED_IMAGE_TYPES,
  buildObjectKey,
  createPresignedUpload,
  deleteObject,
  keyFromPublicUrl,
  MAX_UPLOAD_BYTES,
  publicUrlFor,
  signUploadTicket,
  verifyUploadTicket,
} from '@/lib/r2'
import { requireEditor } from './cms-helpers'

/**
 * ขั้นตอนอัปโหลด แบ่งเป็นสองจังหวะ
 *   1. requestUpload  — เซิร์ฟเวอร์ตรวจสิทธิ์และชนิดไฟล์ แล้วออก presigned URL ให้
 *   2. เบราว์เซอร์ PUT ไฟล์เข้า R2 ตรง ๆ (ไฟล์ไม่ผ่านเซิร์ฟเวอร์ Next เลย)
 *   3. confirmUpload  — บันทึกลงตาราง MediaAsset พร้อมขนาดและ blur placeholder
 *
 * ถ้าขั้นที่ 3 ไม่ถูกเรียก (ผู้ใช้ปิดแท็บกลางคัน) ไฟล์จะค้างใน R2 โดยไม่มีระเบียน
 * ล้างได้จากปุ่มในหน้าคลังไฟล์ภายหลัง
 */

export type UploadTicket =
  | { ok: true; uploadUrl: string; key: string; publicUrl: string; token: string }
  | { ok: false; error: string }

const requestSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  folder: z.string().max(40).optional(),
})

export async function requestUpload(input: {
  fileName: string
  contentType: string
  size: number
  folder?: string
}): Promise<UploadTicket> {
  await requireEditor()

  if (!isR2Configured) {
    return { ok: false, error: 'ยังไม่ได้ตั้งค่า Cloudflare R2 — ติดต่อผู้ดูแลระบบ' }
  }

  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) {
    const tooBig = input.size > MAX_UPLOAD_BYTES
    return {
      ok: false,
      error: tooBig
        ? `ไฟล์ใหญ่เกิน ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`
        : 'รองรับเฉพาะไฟล์ภาพ JPG PNG WebP AVIF และ GIF',
    }
  }

  try {
    const { contentType, size } = parsed.data
    const key = buildObjectKey(parsed.data.fileName, parsed.data.folder)
    const ticket = await createPresignedUpload(key, contentType)

    // ลายเซ็นผูก key เข้ากับชนิดและขนาดที่อนุมัติ ตอนบันทึกจะได้ไม่ต้องเชื่อค่าจากเบราว์เซอร์
    return { ok: true, ...ticket, token: signUploadTicket(key, contentType, size) }
  } catch (error) {
    console.error('[media:requestUpload]', error)
    return { ok: false, error: 'ขอสิทธิ์อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง' }
  }
}

const confirmSchema = z.object({
  key: z.string().min(1).max(300),
  /** ลายเซ็นที่ requestUpload ออกให้ — ผูก key เข้ากับชนิดและขนาดที่อนุมัติไป */
  token: z.string().min(1).max(200),
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  blurData: z.string().max(4000).optional(),
})

export async function confirmUpload(input: {
  key: string
  token: string
  fileName: string
  mimeType: string
  size: number
  width?: number
  height?: number
  blurData?: string
}) {
  const user = await requireEditor()

  const parsed = confirmSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'ข้อมูลไฟล์ไม่ถูกต้อง' }

  const { key, token, mimeType, size } = parsed.data
  if (!verifyUploadTicket(key, mimeType, size, token)) {
    return { ok: false as const, error: 'ตั๋วอัปโหลดไม่ถูกต้อง ลองอัปโหลดใหม่อีกครั้ง' }
  }

  /**
   * url และ folder คำนวณจาก key ที่เซ็นไว้ ไม่รับจากผู้เรียก
   * ค่าที่รับมาแล้วเอาไปเก็บตรง ๆ จะกลายเป็นช่องให้เขียน url ชี้ไปที่ไหนก็ได้ลงคลังไฟล์
   */
  const url = publicUrlFor(key)
  const folder = key.split('/')[0] || 'uploads'

  try {
    await db.mediaAsset.upsert({
      where: { key },
      update: {},
      create: {
        key,
        url,
        fileName: parsed.data.fileName,
        mimeType,
        size,
        width: parsed.data.width ?? null,
        height: parsed.data.height ?? null,
        blurData: parsed.data.blurData ?? null,
        folder,
        uploadedById: user.id,
      },
    })
  } catch (error) {
    console.error('[media:confirmUpload]', error)
    return { ok: false as const, error: 'บันทึกไฟล์ลงคลังไม่สำเร็จ' }
  }

  revalidatePath('/admin/media')
  return { ok: true as const }
}

/** ลบทั้งไฟล์ใน R2 และระเบียนในฐานข้อมูล */
export async function deleteMediaAsset(formData: FormData) {
  await requireEditor()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  try {
    const asset = await db.mediaAsset.findUnique({ where: { id }, select: { key: true } })
    if (!asset) return

    await deleteObject(asset.key)
    await db.mediaAsset.delete({ where: { id } })
  } catch (error) {
    // ลบใน R2 ไม่สำเร็จก็ยังลบระเบียนได้ ไม่ให้รายการค้างในคลัง
    console.error('[media:delete]', error)
    await db.mediaAsset.delete({ where: { id } }).catch(() => undefined)
  }

  revalidatePath('/admin/media')
}

/** ใช้ตอนเปลี่ยนรูปในฟอร์ม เพื่อไม่ให้ไฟล์เก่าค้างกินพื้นที่ */
export async function deleteByUrl(url: string) {
  await requireEditor()

  const key = keyFromPublicUrl(url)
  if (!key) return { ok: false as const }

  try {
    await deleteObject(key)
    await db.mediaAsset.deleteMany({ where: { key } })
  } catch (error) {
    console.error('[media:deleteByUrl]', error)
    return { ok: false as const }
  }

  revalidatePath('/admin/media')
  return { ok: true as const }
}
