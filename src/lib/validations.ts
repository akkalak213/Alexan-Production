import { z } from 'zod'
import { ServiceCategory } from '@/generated/prisma/enums'

// ปล่อยต่อให้โค้ดเดิมที่เคย import จากไฟล์นี้ยังใช้ได้เหมือนเดิม
export { budgetRangeFor, budgetRanges, type BudgetRange } from './lead-options'

/**
 * schema กลางสำหรับฟอร์มสาธารณะ
 * ใช้ทั้งฝั่ง client (แสดง error ทันที) และฝั่ง server action (ห้ามเชื่อ client)
 */

const serviceCategoryEnum = z.enum(
  Object.values(ServiceCategory) as [ServiceCategory, ...ServiceCategory[]],
)

/** ตัดช่องว่างหัวท้ายและยุบช่องว่างซ้อนให้เหลือช่องเดียว */
const trimmed = (min: number, max: number) =>
  z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, ' '))
    .pipe(z.string().min(min).max(max))

/** เบอร์ไทยรับได้ทั้ง 0812345678, 081-234-5678 และ +66812345678 */
const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(\+?66|0)\d{8,9}$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง')
      .or(z.literal('')),
  )
  .optional()

export const reviewSchema = z.object({
  authorName: trimmed(2, 80),
  authorRole: trimmed(0, 120).optional().or(z.literal('')),
  submitterEmail: z.email().max(160).optional().or(z.literal('')),
  content: trimmed(20, 1500),
  rating: z.coerce.number().int().min(1).max(5),
  serviceCategory: serviceCategoryEnum.optional().or(z.literal('')),
  /** honeypot — บอตกรอก มนุษย์ไม่เห็น */
  website: z.literal('').optional(),
})

export type ReviewInput = z.infer<typeof reviewSchema>

export const leadSchema = z.object({
  name: trimmed(2, 100),
  email: z.email().max(160),
  phone: phoneSchema,
  company: trimmed(0, 120).optional().or(z.literal('')),
  services: z.array(serviceCategoryEnum).max(6).default([]),
  budgetRange: z.string().max(60).optional().or(z.literal('')),
  message: trimmed(10, 3000),
  /** รายการอุปกรณ์ที่เลือกจากหน้า /rental — ส่งมาเป็น id */
  equipmentIds: z.array(z.string().cuid2().or(z.string().min(1))).max(30).default([]),
  /** แพ็กเกจที่กดเลือกจากหน้าบริการ */
  packageId: z.string().max(40).optional().or(z.literal('')),
  packageName: z.string().max(160).optional().or(z.literal('')),
  packagePriceTag: z.string().max(120).optional().or(z.literal('')),
  source: z.enum(['CONTACT', 'QUOTE', 'RENTAL', 'SERVICE_PAGE']).default('CONTACT'),
  website: z.literal('').optional(),
})

export type LeadInput = z.infer<typeof leadSchema>

