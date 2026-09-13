import { z } from 'zod'
import { ServiceCategory } from '@/generated/prisma/enums'
import { bangkokDateString } from './bangkok-time'
import { addDaysIso, isIsoDate, MAX_ADVANCE_DAYS, MAX_RENTAL_DAYS } from './rental-request'

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

export const leadSchema = z
  .object({
    name: trimmed(2, 100),
    email: z.email().max(160),
    phone: phoneSchema,
    company: trimmed(0, 120).optional().or(z.literal('')),
    services: z.array(serviceCategoryEnum).max(6).default([]),
    budgetRange: z.string().max(60).optional().or(z.literal('')),
    /** ขั้นต่ำ 10 ตัวอักษรตรวจด้านล่าง — คำขอเช่าอุปกรณ์ไม่บังคับพิมพ์ข้อความ */
    message: trimmed(0, 3000),
    /** รายการอุปกรณ์ที่เลือกจากหน้า /rental — ส่งมาเป็น id */
    equipmentIds: z.array(z.string().cuid2().or(z.string().min(1))).max(30).default([]),
    /** วันที่เริ่มใช้อุปกรณ์ รูปแบบ YYYY-MM-DD */
    startDate: z
      .string()
      .refine((value) => value === '' || isIsoDate(value))
      .optional(),
    /** จำนวนวันที่เช่า */
    rentalDays: z.union([z.literal(''), z.coerce.number().int().min(1).max(MAX_RENTAL_DAYS)]).optional(),
    /** แพ็กเกจที่กดเลือกจากหน้าบริการ */
    packageId: z.string().max(40).optional().or(z.literal('')),
    packageName: z.string().max(160).optional().or(z.literal('')),
    packagePriceTag: z.string().max(120).optional().or(z.literal('')),
    source: z.enum(['CONTACT', 'QUOTE', 'RENTAL', 'SERVICE_PAGE']).default('CONTACT'),
    website: z.literal('').optional(),
  })
  .superRefine((data, ctx) => {
    /**
     * คำขอเช่ามีอุปกรณ์ วันที่ และจำนวนวันบอกสิ่งที่ทีมต้องรู้ครบแล้ว
     * เดิมบังคับให้ลูกค้าพิมพ์อย่างน้อย 10 ตัวอักษรทุกฟอร์ม เป็นขั้นตอนที่ไม่ได้ข้อมูลอะไรเพิ่ม
     */
    if (data.equipmentIds.length === 0 && data.message.length < 10) {
      ctx.addIssue({ code: 'custom', path: ['message'], message: 'ต้องกรอกรายละเอียดอย่างน้อย 10 ตัวอักษร' })
    }

    // เทียบกับวันนี้ตามเวลาไทย เซิร์ฟเวอร์เป็น UTC ถ้าเทียบตรง ๆ ลูกค้าที่จองก่อนเจ็ดโมงเช้าจะเลือกวันนี้ไม่ได้
    if (data.startDate) {
      const today = bangkokDateString()
      if (data.startDate < today || data.startDate > addDaysIso(today, MAX_ADVANCE_DAYS)) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'วันที่ต้องไม่ย้อนหลังและไม่เกินสองปี' })
      }
    }
  })

export type LeadInput = z.infer<typeof leadSchema>

