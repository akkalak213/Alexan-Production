import type {
  BillingCycle,
  ContentStatus,
  EquipmentCategory,
  EquipmentStatus,
  LeadSource,
  LeadStatus,
  PriceUnit,
  ProductType,
  QuoteStatus,
  ReviewStatus,
  ServiceCategory,
} from '@/generated/prisma/enums'

/** ป้ายภาษาไทยของ enum ทั้งหมด ใช้เฉพาะหลังบ้านซึ่งไม่มีระบบสองภาษา */

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: 'ใหม่',
  CONTACTED: 'ติดต่อแล้ว',
  QUOTED: 'เสนอราคาแล้ว',
  WON: 'ปิดการขาย',
  LOST: 'ไม่สำเร็จ',
}

/** สีของสถานะ lead — ใช้บอกด้วยสายตาว่าอันไหนต้องรีบ */
export const leadStatusTone: Record<LeadStatus, string> = {
  NEW: 'bg-accent-subtle text-accent',
  CONTACTED: 'bg-muted text-foreground',
  QUOTED: 'bg-muted text-foreground',
  WON: 'bg-success/15 text-success',
  LOST: 'bg-muted text-muted-foreground',
}

export const leadSourceLabels: Record<LeadSource, string> = {
  CONTACT: 'ฟอร์มติดต่อ',
  QUOTE: 'ขอใบเสนอราคา',
  RENTAL: 'เช่าอุปกรณ์',
  SERVICE_PAGE: 'หน้าบริการ',
  PRODUCT: 'หน้าผลิตภัณฑ์',
}

export const productTypeLabels: Record<ProductType, string> = {
  SOFTWARE: 'โปรแกรม (ซื้อขาด)',
  SUBSCRIPTION: 'ระบบรายเดือน/รายปี',
  DIGITAL: 'เทมเพลต/ไฟล์ดิจิทัล',
  PHYSICAL: 'สินค้า (จัดส่ง)',
}

export const billingCycleLabels: Record<BillingCycle, string> = {
  ONE_TIME: 'ซื้อขาด',
  MONTHLY: 'ต่อเดือน',
  YEARLY: 'ต่อปี',
  CUSTOM: 'สอบถามราคา',
}

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'เผยแพร่แล้ว',
  REJECTED: 'ปฏิเสธแล้ว',
}

export const serviceCategoryLabels: Record<ServiceCategory, string> = {
  WEB: 'เว็บไซต์',
  WEB_APP: 'เว็บแอปพลิเคชัน',
  MOBILE_APP: 'แอปมือถือ',
  PHOTOGRAPHY: 'งานถ่ายภาพ',
  VIDEO: 'งานวิดีโอ',
  STUDIO: 'สตูดิโอ',
}

export const equipmentCategoryLabels: Record<EquipmentCategory, string> = {
  CAMERA: 'กล้อง',
  LENS: 'เลนส์',
  LIGHTING: 'ไฟและแสง',
  AUDIO: 'อุปกรณ์เสียง',
  GRIP: 'ขาตั้งและกิมบอล',
  DRONE: 'โดรน',
  ACCESSORY: 'อุปกรณ์เสริม',
}

export const equipmentStatusLabels: Record<EquipmentStatus, string> = {
  AVAILABLE: 'ว่าง',
  RENTED: 'ถูกเช่าอยู่',
  MAINTENANCE: 'ซ่อมบำรุง',
  RETIRED: 'เลิกให้เช่า',
}

export const contentStatusLabels: Record<ContentStatus, string> = {
  DRAFT: 'ฉบับร่าง',
  PUBLISHED: 'เผยแพร่แล้ว',
  ARCHIVED: 'เก็บเข้าคลัง',
}

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: 'ฉบับร่าง',
  SENT: 'ส่งแล้ว',
  ACCEPTED: 'ลูกค้าตอบรับ',
  DECLINED: 'ลูกค้าปฏิเสธ',
  EXPIRED: 'หมดอายุ',
}

export const priceUnitLabels: Record<PriceUnit, string> = {
  PROJECT: 'ต่อโปรเจกต์',
  DAY: 'ต่อวัน',
  HALF_DAY: 'ต่อครึ่งวัน',
  HOUR: 'ต่อชั่วโมง',
  MONTH: 'ต่อเดือน',
  PERSON: 'ต่อคน',
  CUSTOM: 'ประเมินตามงาน',
}

export const budgetLabels: Record<string, string> = {
  'under-50k': 'ต่ำกว่า 50,000 บาท',
  '50k-150k': '50,000 – 150,000 บาท',
  '150k-500k': '150,000 – 500,000 บาท',
  'over-500k': 'มากกว่า 500,000 บาท',
  'not-sure': 'ยังไม่แน่ใจ',
}
