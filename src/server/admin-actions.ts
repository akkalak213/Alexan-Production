'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { LeadStatus, ReviewStatus } from '@/generated/prisma/enums'
import { db } from '@/lib/db'
import type { AdminActionState } from './admin-state'
import { requireEditor } from './cms-helpers'

/**
 * Server action ของหลังบ้าน
 *
 * ทุกตัวต้องเช็คสิทธิ์เอง — server action เป็น endpoint สาธารณะที่ใครก็ยิงได้
 * middleware กันแค่การเปิดหน้า ไม่ได้กันการเรียก action ตรง ๆ
 *
 * ใช้ requireEditor ตัวเดียวกับฝั่ง CMS ไม่ใช่ตัวที่อ่านแต่ session เหมือนเดิม
 * เพราะตัวนั้นเชื่อ JWT ที่ยังไม่หมดอายุ ทำให้บัญชีที่ถูกปิดไปแล้วยังแก้สถานะลูกค้าและรีวิวได้
 */

/** รีวิวบนหน้าเว็บสาธารณะถูกแคชไว้ (ดู server/cache.ts) — ต้องล้างเองเมื่อข้อมูลที่แสดงเปลี่ยน */
function revalidatePublicReviews() {
  updateTag('reviews')
  revalidatePath('/[locale]/reviews', 'page')
  revalidatePath('/[locale]', 'page')
}

// ──────────────────── คำขอจากลูกค้า ────────────────────

export async function updateLeadStatus(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireEditor()

  const parsed = z
    .object({
      leadId: z.string().min(1),
      status: z.enum(Object.values(LeadStatus) as [LeadStatus, ...LeadStatus[]]),
    })
    .safeParse({ leadId: formData.get('leadId'), status: formData.get('status') })

  if (!parsed.success) return { status: 'error', message: 'ข้อมูลไม่ถูกต้อง' }

  try {
    await db.lead.update({
      where: { id: parsed.data.leadId },
      data: { status: parsed.data.status },
    })
  } catch (error) {
    console.error('[admin:updateLeadStatus]', error)
    return { status: 'error', message: 'บันทึกไม่สำเร็จ' }
  }

  revalidatePath('/admin/leads')
  revalidatePath(`/admin/leads/${parsed.data.leadId}`)
  revalidatePath('/admin')

  return { status: 'success', message: 'อัปเดตสถานะแล้ว' }
}

export async function addLeadNote(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireEditor()

  const parsed = z
    .object({
      leadId: z.string().min(1),
      body: z.string().trim().min(1, 'พิมพ์ข้อความก่อนบันทึก').max(2000),
    })
    .safeParse({ leadId: formData.get('leadId'), body: formData.get('body') })

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  try {
    await db.leadNote.create({
      data: { leadId: parsed.data.leadId, body: parsed.data.body, authorId: user.id },
    })
  } catch (error) {
    console.error('[admin:addLeadNote]', error)
    return { status: 'error', message: 'บันทึกไม่สำเร็จ' }
  }

  revalidatePath(`/admin/leads/${parsed.data.leadId}`)
  return { status: 'success', message: 'บันทึกโน้ตแล้ว' }
}

// ──────────────────── อนุมัติรีวิว ────────────────────

export async function moderateReview(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireEditor()

  const parsed = z
    .object({
      reviewId: z.string().min(1),
      status: z.enum(Object.values(ReviewStatus) as [ReviewStatus, ...ReviewStatus[]]),
      isPinned: z.coerce.boolean().optional(),
    })
    .safeParse({
      reviewId: formData.get('reviewId'),
      status: formData.get('status'),
      isPinned: formData.get('isPinned') === 'on',
    })

  if (!parsed.success) return { status: 'error', message: 'ข้อมูลไม่ถูกต้อง' }

  try {
    await db.review.update({
      where: { id: parsed.data.reviewId },
      data: {
        status: parsed.data.status,
        // บันทึกเวลาอนุมัติครั้งแรกเท่านั้น ไม่ทับของเดิมเวลาแก้ซ้ำ
        approvedAt: parsed.data.status === 'APPROVED' ? new Date() : null,
        isPinned: parsed.data.status === 'APPROVED' ? Boolean(parsed.data.isPinned) : false,
      },
    })
  } catch (error) {
    console.error('[admin:moderateReview]', error)
    return { status: 'error', message: 'บันทึกไม่สำเร็จ' }
  }

  revalidatePath('/admin/reviews')
  revalidatePath('/admin')
  revalidatePublicReviews()

  const label = parsed.data.status === 'APPROVED' ? 'เผยแพร่รีวิวแล้ว' : 'ปฏิเสธรีวิวแล้ว'
  return { status: 'success', message: label }
}

export async function replyToReview(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireEditor()

  const parsed = z
    .object({
      reviewId: z.string().min(1),
      replyTh: z.string().trim().max(1000),
      replyEn: z.string().trim().max(1000),
    })
    .safeParse({
      reviewId: formData.get('reviewId'),
      replyTh: formData.get('replyTh') ?? '',
      replyEn: formData.get('replyEn') ?? '',
    })

  if (!parsed.success) return { status: 'error', message: 'ข้อมูลไม่ถูกต้อง' }

  const { reviewId, replyTh, replyEn } = parsed.data
  const hasReply = Boolean(replyTh || replyEn)

  try {
    await db.review.update({
      where: { id: reviewId },
      data: {
        replyTh: replyTh || null,
        replyEn: replyEn || null,
        repliedAt: hasReply ? new Date() : null,
      },
    })
  } catch (error) {
    console.error('[admin:replyToReview]', error)
    return { status: 'error', message: 'บันทึกไม่สำเร็จ' }
  }

  revalidatePath('/admin/reviews')
  revalidatePublicReviews()

  return { status: 'success', message: hasReply ? 'บันทึกคำตอบกลับแล้ว' : 'ลบคำตอบกลับแล้ว' }
}
