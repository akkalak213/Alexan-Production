'use server'

import { after } from 'next/server'
import type { ServiceCategory } from '@/generated/prisma/enums'
import { db } from '@/lib/db'
import { emailShell, renderRows, sendInternalNotification } from '@/lib/mail'
import { getClientIpHash, getUserAgent, isRateLimited } from '@/lib/rate-limit'
import { leadSchema, reviewSchema } from '@/lib/validations'
import type { ActionState } from './action-state'
import { documentPrefix, nextDocumentNumber, withUniqueRetry } from './document-numbers'

/**
 * Server action ของฟอร์มสาธารณะ — ชนิดของ state อยู่ที่ ./action-state
 *
 * อีเมลแจ้งทีมส่งหลังตอบกลับผู้กรอกแล้ว (after) ไม่ใช่ก่อน
 * เดิมผู้กรอกต้องรอ Resend ตอบอีกครึ่งวินาทีถึงหนึ่งวินาทีกว่าปุ่มจะขึ้นว่าส่งสำเร็จ
 * ข้อมูลบันทึกลงฐานข้อมูลก่อนตอบกลับเสมอ อีเมลเป็นแค่การแจ้งเตือน ถ้าส่งไม่ได้คำขอก็ไม่หาย
 */

function flattenErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const result: Record<string, string[]> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    ;(result[key] ??= []).push(issue.message)
  }
  return result
}

// ─────────────────────────── รีวิว ───────────────────────────

export async function submitReview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reviewSchema.safeParse({
    authorName: formData.get('authorName') ?? '',
    authorRole: formData.get('authorRole') ?? '',
    submitterEmail: formData.get('submitterEmail') ?? '',
    content: formData.get('content') ?? '',
    rating: formData.get('rating') ?? '',
    serviceCategory: formData.get('serviceCategory') ?? '',
    website: formData.get('website') ?? '',
  })

  if (!parsed.success) {
    return {
      status: 'error',
      messageKey: 'invalid',
      fieldErrors: flattenErrors(parsed.error.issues),
    }
  }

  // บอตกรอก honeypot — ตอบว่าสำเร็จเพื่อไม่ให้รู้ว่าโดนจับได้ แต่ไม่บันทึกอะไร
  if (parsed.data.website) return { status: 'success', messageKey: 'reviewSuccess' }

  const ipHash = await getClientIpHash()
  if (await isRateLimited('review', ipHash)) {
    return { status: 'error', messageKey: 'rateLimited' }
  }

  const locale = formData.get('locale') === 'en' ? 'en' : 'th'
  const { authorName, authorRole, submitterEmail, content, rating, serviceCategory } = parsed.data

  try {
    await db.review.create({
      data: {
        authorName,
        authorRole: authorRole || null,
        submitterEmail: submitterEmail || null,
        content,
        rating,
        serviceCategory: (serviceCategory || null) as ServiceCategory | null,
        locale,
        ipHash,
        userAgent: await getUserAgent(),
        // เข้าคิวรออนุมัติเสมอ — ไม่ให้ขึ้นหน้าเว็บทันทีเพื่อกันสแปมและคำหยาบ
        status: 'PENDING',
      },
    })
  } catch (error) {
    console.error('[action:submitReview] บันทึกไม่สำเร็จ', error)
    return { status: 'error', messageKey: 'serverError' }
  }

  after(() =>
    sendInternalNotification({
      subject: `รีวิวใหม่รออนุมัติ · ${rating}★ จาก ${authorName}`,
      replyTo: submitterEmail || undefined,
      html: emailShell(
        'มีรีวิวใหม่รอการอนุมัติ',
        renderRows([
          ['ผู้รีวิว', authorName],
          ['ตำแหน่ง/บริษัท', authorRole],
          ['อีเมล', submitterEmail],
          ['คะแนน', `${rating} / 5`],
          ['บริการ', serviceCategory],
          ['เนื้อหา', content],
        ]),
      ),
    }),
  )

  return { status: 'success', messageKey: 'reviewSuccess' }
}

// ──────────────────── คำขอจากลูกค้า (Lead) ────────────────────

export async function submitLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadSchema.safeParse({
    name: formData.get('name') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    company: formData.get('company') ?? '',
    services: formData.getAll('services').map(String).filter(Boolean),
    budgetRange: formData.get('budgetRange') ?? '',
    message: formData.get('message') ?? '',
    equipmentIds: formData.getAll('equipmentIds').map(String).filter(Boolean),
    packageId: formData.get('packageId') ?? '',
    packageName: formData.get('packageName') ?? '',
    packagePriceTag: formData.get('packagePriceTag') ?? '',
    source: formData.get('source') ?? 'CONTACT',
    website: formData.get('website') ?? '',
  })

  if (!parsed.success) {
    return {
      status: 'error',
      messageKey: 'invalid',
      fieldErrors: flattenErrors(parsed.error.issues),
    }
  }

  if (parsed.data.website) return { status: 'success', messageKey: 'leadSuccess' }

  const ipHash = await getClientIpHash()
  if (await isRateLimited('lead', ipHash)) {
    return { status: 'error', messageKey: 'rateLimited' }
  }

  const locale = formData.get('locale') === 'en' ? 'en' : 'th'
  const {
    name,
    email,
    phone,
    company,
    services,
    budgetRange,
    message,
    equipmentIds,
    source,
    packageId,
    packageName,
    packagePriceTag,
  } = parsed.data

  let refCode: string
  let equipmentLabels: string[]

  try {
    // เก็บชื่ออุปกรณ์ ณ เวลาที่ขอไว้ด้วย เผื่ออุปกรณ์ถูกลบหรือเปลี่ยนชื่อภายหลัง
    const equipment = equipmentIds.length
      ? await db.equipment.findMany({
          where: { id: { in: equipmentIds } },
          select: { id: true, brand: true, model: true },
        })
      : []
    equipmentLabels = equipment.map((item) => `${item.brand} ${item.model}`)

    const prefix = documentPrefix('AX')

    // คำขอสองรายการที่เข้ามาพร้อมกันอาจได้เลขเดียวกัน unique index จะปฏิเสธรายการหลัง แล้วลองเลขถัดไป
    const lead = await withUniqueRetry(async (attempt) => {
      const used = await db.lead.findMany({
        where: { refCode: { startsWith: `${prefix}-` } },
        select: { refCode: true },
      })

      return db.lead.create({
        data: {
          refCode: nextDocumentNumber(prefix, used.map((row) => row.refCode), attempt),
          name,
          email,
          phone: phone || null,
          company: company || null,
          services: services as ServiceCategory[],
          budgetRange: budgetRange || null,
          message,
          locale,
          source,
          ipHash,
          // เก็บ id ไว้เชื่อมกลับหาแพ็กเกจ และเก็บชื่อกับราคาเป็นข้อความคู่กัน
          // เผื่อแพ็กเกจถูกแก้ราคาหรือถูกลบ ทีมขายจะยังรู้ว่าตอนลูกค้ากดเห็นราคาเท่าไหร่
          packageId: packageId || null,
          packageName: packageName || null,
          packagePriceTag: packagePriceTag || null,
          items: {
            create: equipment.map((item) => ({
              equipmentId: item.id,
              labelSnapshot: `${item.brand} ${item.model}`,
            })),
          },
        },
        select: { refCode: true },
      })
    })

    refCode = lead.refCode
  } catch (error) {
    console.error('[action:submitLead] บันทึกไม่สำเร็จ', error)
    return { status: 'error', messageKey: 'serverError' }
  }

  after(() =>
    sendInternalNotification({
      subject: `คำขอใหม่ ${refCode} · ${name}`,
      replyTo: email,
      html: emailShell(
        `คำขอใหม่จากเว็บไซต์ · ${refCode}`,
        renderRows([
          ['ชื่อ', name],
          ['อีเมล', email],
          ['โทร', phone],
          ['บริษัท', company],
          ['ที่มา', source],
          ['บริการที่สนใจ', services.join(', ')],
          ['งบประมาณ', budgetRange],
          ['แพ็กเกจที่เลือก', packageName ? `${packageName} (${packagePriceTag})` : ''],
          ['อุปกรณ์', equipmentLabels.join('\n')],
          ['ข้อความ', message],
        ]),
      ),
    }),
  )

  return { status: 'success', messageKey: 'leadSuccess', refCode }
}
