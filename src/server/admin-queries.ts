import { cache } from 'react'
import type { LeadStatus, ReviewStatus } from '@/generated/prisma/enums'
import { startOfBangkokMonth } from '@/lib/bangkok-time'
import { buildAdminTasks } from '@/lib/admin-tasks'
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
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 86_400_000)
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
  const inThreeDays = new Date(now.getTime() + 3 * 86_400_000)

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
    staleLeadCount,
    staleLeads,
    unsentQuoteCount,
    unsentQuotes,
    expiringQuoteCount,
    expiringQuotes,
    followUpCount,
    followUpLeads,
    placeholderPosts,
    incompleteEquipment,
    mediaWithoutAlt,
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
    // คำขอใหม่ที่รอเกินหนึ่งวัน
    db.lead.count({ where: { status: 'NEW', createdAt: { lt: dayAgo } } }),
    db.lead.findMany({
      where: { status: 'NEW', createdAt: { lt: dayAgo } },
      orderBy: { createdAt: 'asc' },
      take: 3,
      select: { id: true, refCode: true, name: true, createdAt: true },
    }),
    // ใบเสนอราคาที่ยังไม่เคยส่งอีเมลถึงลูกค้า (รวมใบเก่าที่ถูกตั้งสถานะส่งแล้วด้วยมือ)
    db.quote.count({ where: { sentAt: null, status: { in: ['DRAFT', 'SENT'] } } }),
    db.quote.findMany({
      where: { sentAt: null, status: { in: ['DRAFT', 'SENT'] } },
      orderBy: { createdAt: 'asc' },
      take: 3,
      select: { id: true, quoteNumber: true, customerName: true, createdAt: true },
    }),
    // ส่งแล้ว ลูกค้ายังไม่ตอบ และจะหมดอายุภายในสามวันหรือหมดไปแล้ว
    db.quote.count({ where: { status: 'SENT', sentAt: { not: null }, validUntil: { lt: inThreeDays } } }),
    db.quote.findMany({
      where: { status: 'SENT', sentAt: { not: null }, validUntil: { lt: inThreeDays } },
      orderBy: { validUntil: 'asc' },
      take: 3,
      select: { id: true, quoteNumber: true, customerName: true, validUntil: true },
    }),
    // เสนอราคาไปแล้วเกินเจ็ดวันยังไม่มีผล
    db.lead.count({ where: { status: 'QUOTED', updatedAt: { lt: weekAgo } } }),
    db.lead.findMany({
      where: { status: 'QUOTED', updatedAt: { lt: weekAgo } },
      orderBy: { updatedAt: 'asc' },
      take: 3,
      select: { id: true, refCode: true, name: true, updatedAt: true },
    }),
    db.post.count({ where: { status: 'PUBLISHED', coverImage: { contains: 'picsum.photos' } } }),
    db.equipment.count({ where: { isActive: true, OR: [{ image: null }, { image: '' }, { dailyRate: null }] } }),
    db.projectMedia.count({ where: { altTh: null, altEn: null, project: { status: 'PUBLISHED' } } }),
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
    tasks: buildAdminTasks(
      {
        staleLeads: { count: staleLeadCount, rows: staleLeads },
        freshLeadCount: Math.max(0, leadsNew - staleLeadCount),
        unsentQuotes: { count: unsentQuoteCount, rows: unsentQuotes },
        expiringQuotes: { count: expiringQuoteCount, rows: expiringQuotes },
        followUpLeads: { count: followUpCount, rows: followUpLeads },
        pendingReviews: reviewsPending,
        placeholderPosts,
        incompleteEquipment,
        mediaWithoutAlt,
      },
      now,
    ),
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
        preferredDate: true,
        // ชื่ออุปกรณ์ขึ้นเป็นแท็กในรายการ คำขอเช่าไม่มีบริการที่เลือก เดิมจึงไม่มีแท็กอะไรเลย
        items: { select: { labelSnapshot: true }, take: 4 },
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
      items: {
        include: {
          equipment: {
            select: { id: true, slug: true, brand: true, model: true, dailyRate: true, weeklyRate: true, depositAmount: true },
          },
        },
      },
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
      // ผลิตภัณฑ์ที่ลูกค้าสนใจ ชื่อกับราคาตอนกดอยู่ใน packageName/packagePriceTag แล้ว ตรงนี้ใช้ทำลิงก์กลับ
      product: { select: { id: true, slug: true } },
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

export const getAdminProducts = cache(() =>
  db.product.findMany({
    orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
    include: { plans: { select: { price: true, billing: true } }, _count: { select: { leads: true } } },
  }),
)

export const getAdminProduct = cache((id: string) =>
  db.product.findUnique({
    where: { id },
    include: { plans: { orderBy: { order: 'asc' } } },
  }),
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
      preferredDate: true,
      // แพ็กเกจกับเรตค่าเช่าใช้ตั้งราคาตั้งต้นให้ ทีมขายไม่ต้องเปิดอีกแท็บไปลอกตัวเลขมาพิมพ์
      package: {
        select: {
          nameTh: true,
          nameEn: true,
          priceFrom: true,
          priceUnit: true,
          service: { select: { titleTh: true, titleEn: true } },
        },
      },
      items: {
        select: {
          labelSnapshot: true,
          quantity: true,
          days: true,
          equipment: { select: { dailyRate: true, weeklyRate: true, depositAmount: true } },
        },
      },
      product: { select: { nameTh: true, nameEn: true, type: true } },
      productPlan: { select: { nameTh: true, nameEn: true, price: true, billing: true } },
    },
  }),
)
