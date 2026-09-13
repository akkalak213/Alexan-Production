'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { QuoteStatus } from '@/generated/prisma/enums'
import { db } from '@/lib/db'
import { isMailConfigured } from '@/lib/env'
import { toNumber } from '@/lib/format'
import { sendMail } from '@/lib/mail'
import {
  computeQuoteTotals,
  lineAmount,
  normalizeLine,
  normalizeRate,
  quoteInputProblem,
} from '@/lib/quote-math'
import { quoteEmail } from '@/lib/quote-email'
import type { AdminActionState } from './admin-state'
import { integer, optionalText, requireEditor, STALE_WRITE_MESSAGE, text, versionOf } from './cms-helpers'
import { documentPrefix, nextDocumentNumber, withUniqueRetry } from './document-numbers'

const statusSchema = z.enum(Object.values(QuoteStatus) as [QuoteStatus, ...QuoteStatus[]])

/** ใบเสนอราคาถูกแก้ไปแล้วหลังจากเปิดฟอร์ม — โยนเพื่อยกเลิกทรานแซกชันทั้งก้อน */
class StaleQuoteError extends Error {}

/** ลูกค้าที่ยังไม่ได้ใบเสนอราคา เลื่อนเป็น "เสนอราคาแล้ว" ได้ ส่วนที่ปิดการขายไปแล้วห้ามถอยสถานะกลับ */
const QUOTABLE_LEAD_STATUSES = ['NEW', 'CONTACTED'] as const

/**
 * อ่านรายการจาก input ชื่อซ้ำหลายชุด แล้วทิ้งแถวที่ไม่ได้กรอกรายละเอียด
 *
 * เก็บจำนวนและราคาไว้เป็นข้อความตามที่พิมพ์ ให้ quote-math แปลงเอง
 * ฟอร์มฝั่งเบราว์เซอร์ส่งข้อความชุดเดียวกันเข้าฟังก์ชันเดียวกัน ยอดบนจอจึงตรงกับยอดที่บันทึกเสมอ
 */
function readLines(formData: FormData) {
  const descriptions = formData.getAll('itemDescription').map((v) => String(v).trim())
  const quantities = formData.getAll('itemQuantity').map((v) => String(v).trim())
  const units = formData.getAll('itemUnit').map((v) => String(v).trim())
  const unitPrices = formData.getAll('itemUnitPrice').map((v) => String(v).trim())

  return descriptions
    .map((description, index) => ({
      description,
      quantity: quantities[index] ?? '',
      unit: units[index] || null,
      unitPrice: unitPrices[index] ?? '',
    }))
    .filter((line) => line.description)
}

export async function saveQuote(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireEditor()

  const id = optionalText(formData, 'id')
  const customerName = text(formData, 'customerName')
  if (!customerName) return { status: 'error', message: 'ต้องกรอกชื่อลูกค้า' }

  const customerEmail = text(formData, 'customerEmail')
  if (!z.email().safeParse(customerEmail).success) {
    return { status: 'error', message: 'อีเมลลูกค้าไม่ถูกต้อง' }
  }

  const lines = readLines(formData)
  if (lines.length === 0) return { status: 'error', message: 'ต้องมีรายการอย่างน้อยหนึ่งรายการ' }

  // ช่องที่ลบจนว่างถือเป็นศูนย์ ตรงกับที่ฟอร์มคำนวณให้เห็นบนจอ
  const discount = text(formData, 'discount')
  const vatRate = text(formData, 'vatRate')
  const withholdingRate = text(formData, 'withholdingRate')

  const problem = quoteInputProblem({ lines, discount, vatRate, withholdingRate })
  if (problem) return { status: 'error', message: problem }

  const status = statusSchema.safeParse(text(formData, 'status'))
  if (!status.success) return { status: 'error', message: 'สถานะใบเสนอราคาไม่ถูกต้อง' }

  const validUntilRaw = text(formData, 'validUntil')
  const validUntil = validUntilRaw
    ? new Date(validUntilRaw)
    : new Date(Date.now() + integer(formData, 'validDays', 30) * 86_400_000)
  if (Number.isNaN(validUntil.getTime())) return { status: 'error', message: 'วันยืนราคาไม่ถูกต้อง' }

  const totals = computeQuoteTotals({ lines, discount, vatRate, withholdingRate })

  // จำนวน ราคา และอัตราที่บันทึก คือค่าชุดเดียวกับที่ใช้คำนวณ ไม่ปล่อยให้ฐานข้อมูลปัดทศนิยมเองทีหลัง
  const items = lines.map((line, index) => ({
    description: line.description,
    unit: line.unit,
    ...normalizeLine(line),
    amount: lineAmount(line),
    order: index,
  }))

  const data = {
    leadId: optionalText(formData, 'leadId'),
    customerName,
    customerCompany: optionalText(formData, 'customerCompany'),
    customerAddress: optionalText(formData, 'customerAddress'),
    customerTaxId: optionalText(formData, 'customerTaxId'),
    customerEmail,
    customerPhone: optionalText(formData, 'customerPhone'),
    locale: text(formData, 'locale') === 'en' ? 'en' : 'th',
    validUntil,
    subtotal: totals.subtotal,
    discount: totals.discount,
    vatRate: normalizeRate(vatRate),
    vatAmount: totals.vatAmount,
    withholdingRate: normalizeRate(withholdingRate),
    withholdingAmount: totals.withholdingAmount,
    total: totals.total,
    notes: optionalText(formData, 'notes'),
    termsText: optionalText(formData, 'termsText'),
    status: status.data,
  }

  if (id) {
    const expectedVersion = text(formData, 'expectedVersion')

    try {
      const updatedAt = await db.$transaction(async (tx) => {
        /**
         * เทียบเวอร์ชันกับเขียนในคำสั่งเดียว (updateMany ที่มีเงื่อนไข updatedAt)
         * ถ้าอ่านเวอร์ชันก่อนแล้วค่อยเขียน จะมีช่องว่างให้อีกคนบันทึกแทรกเข้ามาได้
         */
        const written = await tx.quote.updateMany({
          where: expectedVersion ? { id, updatedAt: new Date(expectedVersion) } : { id },
          data,
        })
        if (written.count === 0) {
          const exists = await tx.quote.count({ where: { id } })
          throw exists ? new StaleQuoteError() : new Error('ไม่พบใบเสนอราคา')
        }

        // รายการแทนที่ทั้งชุดในทรานแซกชันเดียวกัน ถ้าสร้างใหม่ล้มกลางทาง รายการเดิมต้องไม่หายไปด้วย
        await tx.quoteItem.deleteMany({ where: { quoteId: id } })
        await tx.quoteItem.createMany({ data: items.map((item) => ({ ...item, quoteId: id })) })

        const saved = await tx.quote.findUniqueOrThrow({ where: { id }, select: { updatedAt: true } })
        return saved.updatedAt
      })

      revalidatePath('/admin/quotes')
      revalidatePath(`/admin/quotes/${id}`)
      return { status: 'success', message: 'บันทึกใบเสนอราคาแล้ว', version: versionOf(updatedAt) }
    } catch (error) {
      if (error instanceof StaleQuoteError) return { status: 'error', message: STALE_WRITE_MESSAGE }
      console.error('[quote:save]', error)
      return { status: 'error', message: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' }
    }
  }

  let createdId: string

  try {
    const prefix = documentPrefix('QT')

    const created = await withUniqueRetry((attempt) =>
      db.$transaction(async (tx) => {
        const used = await tx.quote.findMany({
          where: { quoteNumber: { startsWith: `${prefix}-` } },
          select: { quoteNumber: true },
        })

        const quote = await tx.quote.create({
          data: {
            ...data,
            quoteNumber: nextDocumentNumber(prefix, used.map((row) => row.quoteNumber), attempt),
            createdById: user.id,
            items: { create: items },
          },
          select: { id: true },
        })

        // ออกใบเสนอราคาให้ lead แล้ว เลื่อนสถานะให้อัตโนมัติ ทีมจะได้ไม่ลืมอัปเดต
        if (data.leadId) {
          await tx.lead.updateMany({
            where: { id: data.leadId, status: { in: [...QUOTABLE_LEAD_STATUSES] } },
            data: { status: 'QUOTED' },
          })
        }

        return quote
      }),
    )

    createdId = created.id
  } catch (error) {
    console.error('[quote:create]', error)
    return { status: 'error', message: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' }
  }

  if (data.leadId) revalidatePath(`/admin/leads/${data.leadId}`)
  revalidatePath('/admin/quotes')
  revalidatePath('/admin')
  redirect(`/admin/quotes/${createdId}`)
}

export async function updateQuoteStatus(formData: FormData) {
  await requireEditor()

  const id = text(formData, 'id')
  const status = statusSchema.safeParse(text(formData, 'status'))
  if (!id || !status.success) return

  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.quote.findUnique({
        where: { id },
        select: { sentAt: true, acceptedAt: true },
      })
      if (!existing) return

      await tx.quote.update({
        where: { id },
        data: {
          status: status.data,
          // วันที่ส่งเป็นจุดเริ่มนับกำหนดยืนราคา กดสถานะซ้ำจึงต้องไม่ขยับวันแรกที่ส่งไป
          sentAt: status.data === 'SENT' ? (existing.sentAt ?? new Date()) : undefined,
          // ล้างเมื่อไม่ได้อยู่ในสถานะตอบรับแล้ว ไม่งั้นกดผิดแล้วแก้ ไทม์ไลน์จะยังโชว์ว่าลูกค้าตอบรับ
          acceptedAt: status.data === 'ACCEPTED' ? (existing.acceptedAt ?? new Date()) : null,
        },
      })
    })
  } catch (error) {
    console.error('[quote:updateStatus]', error)
  }

  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${id}`)
  revalidatePath('/admin')
}

export async function deleteQuote(formData: FormData) {
  await requireEditor()

  try {
    await db.quote.delete({ where: { id: text(formData, 'id') } })
  } catch (error) {
    console.error('[quote:delete]', error)
  }

  revalidatePath('/admin/quotes')
  redirect('/admin/quotes')
}

/**
 * ส่งใบเสนอราคาให้ลูกค้าทางอีเมล แล้วเลื่อนสถานะเป็น "ส่งแล้ว" ให้อัตโนมัติ
 *
 * เขียนรายการทั้งใบลงในตัวอีเมล ไม่ได้แนบ PDF และไม่ได้ส่งลิงก์ให้กดเข้ามาดู
 * เพราะลิงก์สาธารณะที่เปิดดูใบเสนอราคาได้แปลว่าตัวเลขราคาหลุดออกไปนอกการควบคุม
 * ส่วน PDF ยังออกได้จากปุ่มสั่งพิมพ์ในหน้ารายละเอียด แล้วแนบส่งเองถ้าลูกค้าขอ
 */
export async function sendQuoteToCustomer(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireEditor()

  const id = text(formData, 'id')
  if (!id) return { status: 'error', message: 'ไม่พบใบเสนอราคา' }

  if (!isMailConfigured) {
    return {
      status: 'error',
      message: 'ยังส่งอีเมลไม่ได้ — ต้องตั้งค่า RESEND_API_KEY, MAIL_FROM และ MAIL_TO ก่อน',
    }
  }

  const quote = await db.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { order: 'asc' } } },
  })
  if (!quote) return { status: 'error', message: 'ไม่พบใบเสนอราคานี้ อาจถูกลบไปแล้ว' }
  if (!quote.customerEmail) {
    return { status: 'error', message: 'ใบเสนอราคานี้ยังไม่มีอีเมลลูกค้า กรอกก่อนแล้วบันทึก' }
  }

  const rows = await db.siteSetting.findMany({ where: { key: { in: ['company', 'quote'] } } })
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<
    string,
    Record<string, string> | undefined
  >
  const company = settings.company ?? {}
  const bank = settings.quote ?? {}
  const isEnglish = quote.locale === 'en'

  const { subject, html } = quoteEmail({
    quoteNumber: quote.quoteNumber,
    customerName: quote.customerName,
    locale: quote.locale,
    issueDate: quote.issueDate,
    validUntil: quote.validUntil,
    lines: quote.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity) ?? 0,
      unit: item.unit,
      amount: toNumber(item.amount) ?? 0,
    })),
    subtotal: toNumber(quote.subtotal) ?? 0,
    discount: toNumber(quote.discount) ?? 0,
    vatRate: toNumber(quote.vatRate) ?? 0,
    vatAmount: toNumber(quote.vatAmount) ?? 0,
    withholdingRate: toNumber(quote.withholdingRate) ?? 0,
    withholdingAmount: toNumber(quote.withholdingAmount) ?? 0,
    total: toNumber(quote.total) ?? 0,
    notes: quote.notes,
    terms: quote.termsText,
    companyName:
      (isEnglish ? company.nameEn : company.legalNameTh || company.nameTh) || 'Alexan Production',
    companyPhone: company.phone ?? '',
    companyEmail: company.email ?? '',
    bankName: bank.bankName ?? '',
    bankAccountName: bank.bankAccountName ?? '',
    bankAccountNumber: bank.bankAccountNumber ?? '',
  })

  // ตอบกลับให้ไปเข้ากล่องจริงของทีม ไม่ใช่ที่อยู่ no-reply ที่ใช้ส่งออก
  const result = await sendMail(quote.customerEmail, {
    subject,
    html,
    replyTo: company.email || undefined,
  })

  if (!result.sent) {
    return { status: 'error', message: `ส่งอีเมลไม่สำเร็จ — ${result.reason}` }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        // ส่งซ้ำต้องไม่ทับเวลาที่ส่งครั้งแรก ซึ่งเป็นวันที่ใช้อ้างอิงเวลานับกำหนดยืนราคา
        data: { status: 'SENT', sentAt: quote.sentAt ?? new Date() },
      })

      if (quote.leadId) {
        await tx.lead.updateMany({
          where: { id: quote.leadId, status: { in: [...QUOTABLE_LEAD_STATUSES] } },
          data: { status: 'QUOTED' },
        })
      }
    })
  } catch (error) {
    console.error('[quote:sendToCustomer] อัปเดตสถานะไม่สำเร็จ', error)
    return {
      status: 'error',
      message: 'ส่งอีเมลออกไปแล้ว แต่อัปเดตสถานะในระบบไม่สำเร็จ กรุณาเปลี่ยนสถานะเป็น "ส่งแล้ว" เอง',
    }
  }

  if (quote.leadId) {
    revalidatePath(`/admin/leads/${quote.leadId}`)
    revalidatePath('/admin/leads')
  }
  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${id}`)
  revalidatePath('/admin')

  return { status: 'success', message: `ส่งใบเสนอราคาไปที่ ${quote.customerEmail} แล้ว` }
}
