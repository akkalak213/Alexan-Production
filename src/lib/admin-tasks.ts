/**
 * รายการ "สิ่งที่ควรทำตอนนี้" บนแดชบอร์ดหลังบ้าน
 *
 * แดชบอร์ดเดิมบอกแค่จำนวน เช่น คำขอใหม่ 4 รายการ แต่ไม่บอกว่าอันไหนรอมานานจนลูกค้าน่าจะหายไปแล้ว
 * ใบเสนอราคาไหนยังไม่ถึงมือลูกค้า หรือใบไหนกำลังจะหมดอายุโดยที่ยังไม่มีใครตาม
 * ที่นี่เรียงงานตามความเร่ง และลิงก์ตรงไปที่รายการนั้นเมื่อมีรายการเดียว
 *
 * ไม่ยุ่งกับฐานข้อมูล รับข้อมูลที่อ่านมาแล้ว เพื่อทดสอบได้ด้วยเวลาที่กำหนดเอง
 */

export type TaskTone = 'urgent' | 'warning' | 'info'

export type AdminTask = {
  id: string
  tone: TaskTone
  title: string
  detail: string
  href: string
  count: number
}

type LeadRow = { id: string; refCode: string; name: string; createdAt: Date }
type QuoteRow = { id: string; quoteNumber: string; customerName: string; createdAt: Date }
type ExpiringQuoteRow = { id: string; quoteNumber: string; customerName: string; validUntil: Date }
type FollowUpRow = { id: string; refCode: string; name: string; updatedAt: Date }

export type AdminTaskInput = {
  staleLeads: { count: number; rows: LeadRow[] }
  freshLeadCount: number
  unsentQuotes: { count: number; rows: QuoteRow[] }
  expiringQuotes: { count: number; rows: ExpiringQuoteRow[] }
  followUpLeads: { count: number; rows: FollowUpRow[] }
  pendingReviews: number
  placeholderPosts: number
  incompleteEquipment: number
  mediaWithoutAlt: number
}

const DAY_MS = 86_400_000
const toneOrder: Record<TaskTone, number> = { urgent: 0, warning: 1, info: 2 }

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS))
}

function preview<T>(rows: T[], count: number, describe: (row: T) => string): string {
  const shown = rows.slice(0, 2).map(describe).join(' · ')
  return count > 2 ? `${shown} และอีก ${count - 2} รายการ` : shown
}

const shortDate = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' })

export function buildAdminTasks(input: AdminTaskInput, now = new Date()): AdminTask[] {
  const tasks: AdminTask[] = []

  if (input.staleLeads.count > 0) {
    const [first] = input.staleLeads.rows
    tasks.push({
      id: 'stale-leads',
      tone: 'urgent',
      title: 'คำขอที่รอตอบเกินหนึ่งวัน',
      detail: preview(input.staleLeads.rows, input.staleLeads.count, (lead) => `${lead.refCode} ${lead.name} รอมา ${daysBetween(lead.createdAt, now)} วัน`),
      href: input.staleLeads.count === 1 && first ? `/admin/leads/${first.id}` : '/admin/leads?status=NEW',
      count: input.staleLeads.count,
    })
  }

  if (input.freshLeadCount > 0) {
    tasks.push({
      id: 'fresh-leads',
      tone: 'warning',
      title: 'คำขอใหม่ที่ยังไม่ได้ติดต่อกลับ',
      detail: 'เข้ามาภายใน 24 ชั่วโมง ตอบเร็วมีโอกาสปิดการขายสูงกว่า',
      href: '/admin/leads?status=NEW',
      count: input.freshLeadCount,
    })
  }

  if (input.expiringQuotes.count > 0) {
    const [first] = input.expiringQuotes.rows
    tasks.push({
      id: 'expiring-quotes',
      tone: 'warning',
      title: 'ใบเสนอราคาใกล้หมดอายุหรือหมดแล้ว แต่ลูกค้ายังไม่ตอบ',
      detail: preview(input.expiringQuotes.rows, input.expiringQuotes.count, (quote) =>
        quote.validUntil < now
          ? `${quote.quoteNumber} ${quote.customerName} หมดอายุแล้ว`
          : `${quote.quoteNumber} ${quote.customerName} หมดอายุ ${shortDate.format(quote.validUntil)}`,
      ),
      href: input.expiringQuotes.count === 1 && first ? `/admin/quotes/${first.id}` : '/admin/quotes',
      count: input.expiringQuotes.count,
    })
  }

  if (input.unsentQuotes.count > 0) {
    const [first] = input.unsentQuotes.rows
    tasks.push({
      id: 'unsent-quotes',
      tone: 'warning',
      title: 'ใบเสนอราคาที่ยังไม่ได้ส่งถึงลูกค้า',
      detail: preview(input.unsentQuotes.rows, input.unsentQuotes.count, (quote) => `${quote.quoteNumber} ${quote.customerName}`),
      href: input.unsentQuotes.count === 1 && first ? `/admin/quotes/${first.id}` : '/admin/quotes',
      count: input.unsentQuotes.count,
    })
  }

  if (input.followUpLeads.count > 0) {
    const [first] = input.followUpLeads.rows
    tasks.push({
      id: 'follow-up',
      tone: 'info',
      title: 'เสนอราคาไปเกินเจ็ดวันแล้ว ถึงเวลาตามลูกค้า',
      detail: preview(input.followUpLeads.rows, input.followUpLeads.count, (lead) => `${lead.refCode} ${lead.name} ${daysBetween(lead.updatedAt, now)} วัน`),
      href: input.followUpLeads.count === 1 && first ? `/admin/leads/${first.id}` : '/admin/leads?status=QUOTED',
      count: input.followUpLeads.count,
    })
  }

  if (input.pendingReviews > 0) {
    tasks.push({
      id: 'reviews',
      tone: 'info',
      title: 'รีวิวรออนุมัติ',
      detail: 'รีวิวที่อนุมัติแล้วจึงจะขึ้นบนหน้าเว็บ',
      href: '/admin/reviews',
      count: input.pendingReviews,
    })
  }

  if (input.placeholderPosts > 0) {
    tasks.push({
      id: 'placeholder-posts',
      tone: 'info',
      title: 'บทความที่เผยแพร่อยู่ยังใช้รูปตัวอย่าง',
      detail: 'รูปปกจาก picsum.photos เป็นรูปสุ่ม ไม่เกี่ยวกับเนื้อหา เปลี่ยนเป็นรูปจริงก่อนแชร์',
      href: '/admin/posts',
      count: input.placeholderPosts,
    })
  }

  if (input.incompleteEquipment > 0) {
    tasks.push({
      id: 'incomplete-equipment',
      tone: 'info',
      title: 'อุปกรณ์ที่แสดงบนเว็บแต่ยังไม่มีรูปหรือค่าเช่า',
      detail: 'ลูกค้าเห็นเป็น "สอบถามราคา" และคำนวณใบเสนอราคาเบื้องต้นไม่ได้',
      href: '/admin/equipment',
      count: input.incompleteEquipment,
    })
  }

  if (input.mediaWithoutAlt > 0) {
    tasks.push({
      id: 'media-alt',
      tone: 'info',
      title: 'ภาพในผลงานที่ยังไม่มีคำอธิบาย',
      detail: 'ตอนนี้ใช้ชื่องานแทน ใส่คำอธิบายจริงช่วยให้ติดผลค้นหารูปของ Google',
      href: '/admin/projects',
      count: input.mediaWithoutAlt,
    })
  }

  return tasks.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone])
}
