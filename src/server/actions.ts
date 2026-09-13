'use server'

import { after } from 'next/server'
import type { ServiceCategory } from '@/generated/prisma/enums'
import { serviceCategoryLabels } from '@/lib/admin-labels'
import { bangkokMidnight } from '@/lib/bangkok-time'
import { db } from '@/lib/db'
import { clientEnv, isMailConfigured } from '@/lib/env'
import { equipmentName, toNumber } from '@/lib/format'
import { leadNotificationEmail, leadReceiptEmail, type LeadEmailData, type LeadEmailRental } from '@/lib/lead-email'
import { emailShell, renderRows, sendInternalNotification, sendMail } from '@/lib/mail'
import { getClientIpHash, getUserAgent, isRateLimited } from '@/lib/rate-limit'
import { rentalRequestEstimate } from '@/lib/rental-request'
import { getSiteSettings } from '@/lib/settings'
import { leadSchema, reviewSchema } from '@/lib/validations'
import type { ActionState } from './action-state'
import { documentPrefix, nextDocumentNumber, withUniqueRetry } from './document-numbers'

/**
 * Server action ของฟอร์มสาธารณะ — ชนิดของ state อยู่ที่ ./action-state
 *
 * อีเมลส่งหลังตอบกลับผู้กรอกแล้ว (after) ไม่ใช่ก่อน
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
        serviceCategory: serviceCategory as ServiceCategory,
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
          ['บริการ', serviceCategoryLabels[serviceCategory as ServiceCategory] ?? serviceCategory],
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
    startDate: formData.get('startDate') ?? '',
    rentalDays: formData.get('rentalDays') ?? '',
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
    startDate,
    rentalDays,
    source,
    packageId,
    packageName,
    packagePriceTag,
  } = parsed.data

  let refCode: string
  let leadId: string
  let rental: LeadEmailRental | null = null

  try {
    // เก็บชื่ออุปกรณ์ ณ เวลาที่ขอไว้ด้วย เผื่ออุปกรณ์ถูกลบหรือเปลี่ยนชื่อภายหลัง
    const equipment = equipmentIds.length
      ? await db.equipment.findMany({
          where: { id: { in: equipmentIds } },
          select: { id: true, brand: true, model: true, dailyRate: true, weeklyRate: true, depositAmount: true },
        })
      : []

    // จำนวนวันกับวันที่เริ่มใช้มีความหมายเฉพาะคำขอที่มีอุปกรณ์
    const days = equipment.length && rentalDays ? rentalDays : null
    const preferredDate = equipment.length && startDate ? startDate : null

    if (equipment.length) {
      const estimate = rentalRequestEstimate(
        equipment.map((item) => ({
          id: item.id,
          label: equipmentName(item.brand, item.model),
          dailyRate: toNumber(item.dailyRate),
          weeklyRate: toNumber(item.weeklyRate),
          deposit: toNumber(item.depositAmount),
        })),
        days ?? 1,
      )
      rental = {
        startDate: preferredDate,
        days,
        items: estimate.lines,
        subtotal: estimate.subtotal,
        deposit: estimate.deposit,
        hasOnRequest: estimate.hasOnRequest,
      }
    }

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
          preferredDate: preferredDate ? bangkokMidnight(preferredDate) : null,
          // เก็บ id ไว้เชื่อมกลับหาแพ็กเกจ และเก็บชื่อกับราคาเป็นข้อความคู่กัน
          // เผื่อแพ็กเกจถูกแก้ราคาหรือถูกลบ ทีมขายจะยังรู้ว่าตอนลูกค้ากดเห็นราคาเท่าไหร่
          packageId: packageId || null,
          packageName: packageName || null,
          packagePriceTag: packagePriceTag || null,
          items: {
            create: equipment.map((item) => ({
              equipmentId: item.id,
              labelSnapshot: equipmentName(item.brand, item.model),
              days,
            })),
          },
        },
        select: { id: true, refCode: true },
      })
    })

    refCode = lead.refCode
    leadId = lead.id
  } catch (error) {
    console.error('[action:submitLead] บันทึกไม่สำเร็จ', error)
    return { status: 'error', messageKey: 'serverError' }
  }

  const emailData: LeadEmailData = {
    refCode,
    locale,
    source,
    name,
    email,
    phone: phone || null,
    company: company || null,
    services,
    budgetRange: budgetRange || null,
    packageName: packageName || null,
    packagePriceTag: packagePriceTag || null,
    message,
    rental,
  }

  after(async () => {
    const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    const { company: settings } = await getSiteSettings()

    const notification = leadNotificationEmail(emailData, {
      lead: `${siteUrl}/admin/leads/${leadId}`,
      newQuote: `${siteUrl}/admin/quotes/new?leadId=${leadId}`,
    })
    const receipt = leadReceiptEmail(emailData, {
      name: settings.nameEn || 'Alexan Production',
      phone: settings.phone,
      email: settings.email,
      lineId: settings.lineId,
    })

    await Promise.allSettled([
      sendInternalNotification({ subject: notification.subject, html: notification.html, replyTo: email }),
      // ลูกค้ากดตอบกลับแล้วต้องถึงกล่องจริงของทีม ไม่ใช่ที่อยู่ no-reply ที่ใช้ส่งออก
      sendMail(email, { subject: receipt.subject, html: receipt.html, replyTo: settings.email || undefined }),
    ])
  })

  return { status: 'success', messageKey: 'leadSuccess', refCode, receiptSent: isMailConfigured }
}
