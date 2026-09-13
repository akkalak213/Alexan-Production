import { cache } from 'react'
import type { LeadStatus, ReviewStatus } from '@/generated/prisma/enums'
import { startOfBangkokMonth } from '@/lib/bangkok-time'
import { db } from '@/lib/db'

/**
 * Query ของหลังบ้าน
 *
 * ต่างจาก server/queries.ts ตรงที่ไม่มี fallback เงียบ ๆ
 * ถ้าฐานข้อมูลล่ม แอดมินควรเห็นหน้า error ไปเลย ดีกว่าเห็นตัวเลข 0 แล้วเข้าใจผิดว่าไม่มีงานค้าง
 */

/** ตัวเลขบนป้ายแจ้งเตือนใน sidebar — งานที่ยังไม่มีใครแตะ */
export const getAdminCounts = cache(async () => {
  const [leads, reviews] = await Promise.all([
    db.lead.count({ where: { status: 'NEW' } }),
    db.review.count({ where: { status: 'PENDING' } }),
  ])
  return { leads, reviews }
})

export const getDashboardData = cache(async () => {
  // ต้นเดือนตามเวลาไทย เซิร์ฟเวอร์ใช้ UTC ซึ่งช้ากว่าเจ็ดชั่วโมง
  const startOfMonth = startOfBangkokMonth()

  const [
    leadsNew,
    leadsThisMonth,
    leadsWon,
    reviewsPending,
    reviewsApproved,
    ratingAggregate,
    projectsPublished,
    projectsDraft,
    quotesDraft,
    quotesSent,
    recentLeads,
    recentReviews,
  ] = await Promise.all([
    db.lead.count({ where: { status: 'NEW' } }),
    db.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.lead.count({ where: { status: 'WON' } }),
    db.review.count({ where: { status: 'PENDING' } }),
    db.review.count({ where: { status: 'APPROVED' } }),
    db.review.aggregate({ where: { status: 'APPROVED' }, _avg: { rating: true } }),
    db.project.count({ where: { status: 'PUBLISHED' } }),
    db.project.count({ where: { status: 'DRAFT' } }),
    db.quote.count({ where: { status: 'DRAFT' } }),
    db.quote.count({ where: { status: 'SENT' } }),
    db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        refCode: true,
        name: true,
        company: true,
        source: true,
        status: true,
        services: true,
        createdAt: true,
      },
    }),
    db.review.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        authorName: true,
        authorRole: true,
        rating: true,
        content: true,
        createdAt: true,
      },
    }),
  ])

  return {
    leads: { new: leadsNew, thisMonth: leadsThisMonth, won: leadsWon },
    reviews: {
      pending: reviewsPending,
      approved: reviewsApproved,
      average: ratingAggregate._avg.rating ?? 0,
    },
    projects: { published: projectsPublished, draft: projectsDraft },
    quotes: { draft: quotesDraft, sent: quotesSent },
    recentLeads,
    recentReviews,
  }
})

// ──────────────────── คำขอจากลูกค้า ────────────────────

export const getLeads = cache(async (status?: LeadStatus) => {
  const [leads, counts] = await Promise.all([
    db.lead.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      select: {
        id: true,
        refCode: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        source: true,
        status: true,
        services: true,
        budgetRange: true,
        createdAt: true,
        _count: { select: { items: true, notes: true, quotes: true } },
      },
    }),
    db.lead.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  return {
    leads,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<
      Record<LeadStatus, number>
    >,
    total: counts.reduce((sum, c) => sum + c._count._all, 0),
  }
})

export const getLeadById = cache((id: string) =>
  db.lead.findUnique({
    where: { id },
    include: {
      items: { include: { equipment: { select: { id: true, slug: true, brand: true, model: true } } } },
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { name: true } } },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, quoteNumber: true, status: true, total: true, issueDate: true },
      },
      // แพ็กเกจที่ลูกค้ากดเลือกมาจากหน้าบริการ อาจถูกลบไปแล้ว จึงต้องเช็ค null ตอนใช้
      package: {
        select: { id: true, service: { select: { id: true, titleTh: true } } },
      },
    },
  }),
)

// ──────────────────── รีวิวที่ต้องตรวจ ────────────────────

export const getReviewsForModeration = cache(async (status: ReviewStatus = 'PENDING') => {
  const [reviews, counts] = await Promise.all([
    db.review.findMany({
      where: { status },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    }),
    db.review.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  return {
    reviews,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<
      Record<ReviewStatus, number>
    >,
  }
})

// ──────────────────── CMS: รายการและรายละเอียด ────────────────────

export const getAdminProjects = cache(() =>
  db.project.findMany({
    orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      titleTh: true,
      category: true,
      status: true,
      isFeatured: true,
      year: true,
      clientName: true,
      coverImage: true,
      order: true,
      _count: { select: { media: true } },
    },
  }),
)

export const getAdminProject = cache((id: string) =>
  db.project.findUnique({
    where: { id },
    include: { media: { orderBy: { order: 'asc' } } },
  }),
)

export const getAdminEquipmentList = cache(() =>
  db.equipment.findMany({
    orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { order: 'asc' }],
  }),
)

export const getAdminEquipmentItem = cache((id: string) =>
  db.equipment.findUnique({ where: { id } }),
)

export const getAdminServices = cache(() =>
  db.service.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { packages: true, projects: true } } },
  }),
)

export const getAdminService = cache((id: string) =>
  db.service.findUnique({
    where: { id },
    include: { packages: { orderBy: { order: 'asc' } } },
  }),
)

export const getAdminPosts = cache(() =>
  db.post.findMany({
    orderBy: [{ status: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      titleTh: true,
      status: true,
      isFeatured: true,
      tags: true,
      readingMinutes: true,
      publishedAt: true,
    },
  }),
)

export const getAdminPost = cache((id: string) => db.post.findUnique({ where: { id } }))

export const getAdminTeam = cache(() => db.teamMember.findMany({ orderBy: { order: 'asc' } }))

export const getAdminSettings = cache(async () => {
  const rows = await db.siteSetting.findMany()
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    Record<string, unknown> | undefined
  >
})

// ──────────────────── ใบเสนอราคา ────────────────────

export const getQuotes = cache(() =>
  db.quote.findMany({
    orderBy: [{ issueDate: 'desc' }],
    take: 200,
    select: {
      id: true,
      quoteNumber: true,
      customerName: true,
      customerCompany: true,
      status: true,
      total: true,
      issueDate: true,
      validUntil: true,
      lead: { select: { id: true, refCode: true } },
    },
  }),
)

export const getQuote = cache((id: string) =>
  db.quote.findUnique({
    where: { id },
    include: {
      items: { orderBy: { order: 'asc' } },
      lead: { select: { id: true, refCode: true } },
      createdBy: { select: { name: true } },
    },
  }),
)

/** ข้อมูลลูกค้าจาก lead ใช้เติมฟอร์มใบเสนอราคาให้อัตโนมัติ */
export const getLeadForQuote = cache((id: string) =>
  db.lead.findUnique({
    where: { id },
    select: {
      id: true,
      refCode: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      locale: true,
      items: { select: { labelSnapshot: true, quantity: true, days: true } },
    },
  }),
)
