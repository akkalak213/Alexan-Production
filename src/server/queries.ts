import { cache } from 'react'
import type { EquipmentCategory, ServiceCategory } from '@/generated/prisma/enums'
import { db } from '@/lib/db'
import { publicProjectWhere, publicReviewWhere } from '@/lib/sample-content'

/**
 * Query ทั้งหมดของหน้าเว็บสาธารณะ
 *
 * Failed reads reach the localized retry boundary; empty states mean a successful read with no records.
 * แต่ยัง log ทุกครั้งเพื่อให้จับปัญหาได้จาก log ของ Railway
 */
async function safe<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch (error) {
    console.error(`[query:${label}] อ่านฐานข้อมูลไม่สำเร็จ`, error)
    // The fallback argument retains query inference; unavailable data is not an empty catalogue.
    void fallback
    throw new Error('Public data is temporarily unavailable', { cause: error })
  }
}

// ─────────────────────────── บริการ ───────────────────────────

const serviceCardSelect = {
  id: true,
  slug: true,
  category: true,
  icon: true,
  titleTh: true,
  titleEn: true,
  taglineTh: true,
  taglineEn: true,
  coverImage: true,
} as const

export const getActiveServices = cache(() =>
  safe(
    'services',
    () =>
      db.service.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: serviceCardSelect,
      }),
    [],
  ),
)

export const getServiceBySlug = cache((slug: string) =>
  safe(
    'service-detail',
    () =>
      db.service.findFirst({
        where: { slug, isActive: true },
        include: {
          packages: { where: { isActive: true }, orderBy: { order: 'asc' } },
        },
      }),
    null,
  ),
)

export const getServiceSlugs = cache(() =>
  safe(
    'service-slugs',
    () =>
      db.service.findMany({
        where: { isActive: true },
        // updatedAt ไปเป็น lastmod ใน sitemap — Google ใช้ตัดสินว่าควรกลับมาเก็บหน้านี้ใหม่เมื่อไหร่
        select: { slug: true, updatedAt: true },
      }),
    [] as { slug: string; updatedAt: Date }[],
  ),
)

// ─────────────────────────── ผลงาน ───────────────────────────

const projectCardSelect = {
  id: true,
  slug: true,
  category: true,
  titleTh: true,
  titleEn: true,
  summaryTh: true,
  summaryEn: true,
  coverImage: true,
  coverBlurData: true,
  clientName: true,
  year: true,
  isFeatured: true,
} as const

export const getProjects = cache((category?: ServiceCategory) =>
  safe(
    'projects',
    () =>
      db.project.findMany({
        where: { ...publicProjectWhere, ...(category ? { category } : {}) },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { order: 'asc' }],
        select: projectCardSelect,
      }),
    [],
  ),
)

export const getFeaturedProjects = cache((take = 4) =>
  safe(
    'featured-projects',
    () =>
      db.project.findMany({
        where: { ...publicProjectWhere, isFeatured: true },
        orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
        take,
        select: projectCardSelect,
      }),
    [],
  ),
)

export const getProjectBySlug = cache((slug: string) =>
  safe(
    'project-detail',
    () =>
      db.project.findFirst({
        where: { slug, ...publicProjectWhere },
        include: {
          media: { orderBy: { order: 'asc' } },
          service: { select: { slug: true, titleTh: true, titleEn: true } },
        },
      }),
    null,
  ),
)

export const getProjectSlugs = cache(() =>
  safe(
    'project-slugs',
    () =>
      db.project.findMany({
        where: { ...publicProjectWhere },
        select: { slug: true, updatedAt: true },
      }),
    [] as { slug: string; updatedAt: Date }[],
  ),
)

export const getRelatedProjects = cache((category: ServiceCategory, excludeId: string, take = 3) =>
  safe(
    'related-projects',
    () =>
      db.project.findMany({
        where: { ...publicProjectWhere, category, id: { not: excludeId } },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        take,
        select: projectCardSelect,
      }),
    [],
  ),
)

export const getProjectCountsByCategory = cache(() =>
  safe(
    'project-counts',
    async () => {
      const rows = await db.project.groupBy({
        by: ['category'],
        where: { ...publicProjectWhere },
        _count: { _all: true },
      })
      return Object.fromEntries(rows.map((r) => [r.category, r._count._all])) as Partial<
        Record<ServiceCategory, number>
      >
    },
    {} as Partial<Record<ServiceCategory, number>>,
  ),
)

// ─────────────────────── อุปกรณ์ให้เช่า ───────────────────────

export const getEquipment = cache((category?: EquipmentCategory) =>
  safe(
    'equipment',
    () =>
      db.equipment.findMany({
        where: { isActive: true, ...(category ? { category } : {}) },
        orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }],
      }),
    [],
  ),
)

/**
 * อุปกรณ์ที่ลูกค้าติ๊กไว้ เพื่อเอาไปทำใบเสนอราคาเบื้องต้น
 *
 * URL ส่งมาแค่ id เหมือนหน้าแพ็กเกจ ราคาอ่านจากฐานข้อมูลที่นี่เสมอ
 * แก้ตัวเลขจากแถบที่อยู่ไม่ได้ และเอกสารที่ลูกค้าถือจะตรงกับเรตจริงในระบบวันนั้น
 *
 * เรียงตามลำดับที่ตั้งไว้ในหลังบ้าน ไม่ใช่ตามลำดับที่ส่งมาใน URL
 * เพื่อให้เอกสารของลูกค้าสองคนที่เลือกของชุดเดียวกันหน้าตาเหมือนกัน
 */
export const getEquipmentByIds = cache((ids: string[]) =>
  safe(
    'equipment-by-ids',
    () =>
      ids.length
        ? db.equipment.findMany({
            where: { id: { in: ids }, isActive: true },
            orderBy: [{ category: 'asc' }, { order: 'asc' }],
          })
        : Promise.resolve([]),
    [],
  ),
)

export const getEquipmentBySlug = cache((slug: string) =>
  safe(
    'equipment-detail',
    () => db.equipment.findFirst({ where: { slug, isActive: true } }),
    null,
  ),
)

export const getEquipmentSlugs = cache(() =>
  safe(
    'equipment-slugs',
    () =>
      db.equipment.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    [] as { slug: string; updatedAt: Date }[],
  ),
)

/**
 * อุปกรณ์อื่นในหมวดเดียวกัน ใช้ท้ายหน้ารายละเอียด
 *
 * นอกจากช่วยให้ลูกค้าเทียบของได้ต่อ ยังเป็นการเชื่อมหน้ารายละเอียดเข้าหากันเอง
 * หน้าที่มีแต่ลิงก์เข้าไม่มีลิงก์ออกจะถูกมองว่าเป็นทางตัน และได้น้ำหนักน้อยกว่าที่ควร
 */
export const getRelatedEquipment = cache(
  (category: EquipmentCategory, excludeId: string, take = 3) =>
    safe(
      'equipment-related',
      () =>
        db.equipment.findMany({
          where: { isActive: true, category, id: { not: excludeId } },
          orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }],
          take,
        }),
      [],
    ),
)

export const getEquipmentCountsByCategory = cache(() =>
  safe(
    'equipment-counts',
    async () => {
      const rows = await db.equipment.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { _all: true },
      })
      return Object.fromEntries(rows.map((r) => [r.category, r._count._all])) as Partial<
        Record<EquipmentCategory, number>
      >
    },
    {} as Partial<Record<EquipmentCategory, number>>,
  ),
)

// ─────────────────────────── รีวิว ───────────────────────────

export const getApprovedReviews = cache((take?: number) =>
  safe(
    'reviews',
    () =>
      db.review.findMany({
        where: { ...publicReviewWhere },
        orderBy: [{ isPinned: 'desc' }, { approvedAt: 'desc' }, { createdAt: 'desc' }],
        ...(take ? { take } : {}),
        select: {
          id: true,
          authorName: true,
          authorRole: true,
          authorAvatar: true,
          content: true,
          rating: true,
          serviceCategory: true,
          locale: true,
          isPinned: true,
          replyTh: true,
          replyEn: true,
          repliedAt: true,
          createdAt: true,
        },
      }),
    [],
  ),
)

export const getReviewStats = cache(() =>
  safe(
    'review-stats',
    async () => {
      const [aggregate, byRating] = await Promise.all([
        db.review.aggregate({
          where: { ...publicReviewWhere },
          _count: true,
          _avg: { rating: true },
        }),
        db.review.groupBy({
          by: ['rating'],
          where: { ...publicReviewWhere },
          _count: { _all: true },
        }),
      ])

      const counts = new Map(byRating.map((r) => [r.rating, r._count._all]))
      const total = aggregate._count

      return {
        total,
        average: aggregate._avg.rating ?? 0,
        distribution: [5, 4, 3, 2, 1].map((star) => {
          const count = counts.get(star) ?? 0
          return { star, count, percent: total > 0 ? (count / total) * 100 : 0 }
        }),
      }
    },
    {
      total: 0,
      average: 0,
      distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, percent: 0 })),
    },
  ),
)

// ─────────────────────────── บทความ ───────────────────────────

const postCardSelect = {
  id: true,
  slug: true,
  titleTh: true,
  titleEn: true,
  excerptTh: true,
  excerptEn: true,
  coverImage: true,
  tags: true,
  readingMinutes: true,
  publishedAt: true,
  isFeatured: true,
} as const

export const getPosts = cache((take?: number) =>
  safe(
    'posts',
    () =>
      db.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        ...(take ? { take } : {}),
        select: postCardSelect,
      }),
    [],
  ),
)

export const getPostBySlug = cache((slug: string) =>
  safe(
    'post-detail',
    () =>
      db.post.findFirst({
        where: { slug, status: 'PUBLISHED' },
        include: { author: { select: { name: true, avatarUrl: true } } },
      }),
    null,
  ),
)

export const getPostSlugs = cache(() =>
  safe(
    'post-slugs',
    () =>
      db.post.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
    [] as { slug: string; updatedAt: Date }[],
  ),
)

// ─────────────────────────── ทีมงาน ───────────────────────────

export const getTeamMembers = cache(() =>
  safe(
    'team',
    () => db.teamMember.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
    [],
  ),
)

// ─────────────────────── สถิติหน้าแรก ───────────────────────

export const getHomeStats = cache(() =>
  safe(
    'home-stats',
    async () => {
      const [projects, reviews] = await Promise.all([
        db.project.count({ where: publicProjectWhere }),
        db.review.aggregate({
          where: { ...publicReviewWhere },
          _count: true,
          _avg: { rating: true },
        }),
      ])

      return {
        projects,
        reviewCount: reviews._count,
        averageRating: reviews._avg.rating ?? 0,
      }
    },
    { projects: 0, reviewCount: 0, averageRating: 0 },
  ),
)

/**
 * แพ็กเกจที่ลูกค้ากดมาจากหน้าบริการ เพื่อเอาไปแสดงบนหน้าขอใบเสนอราคา
 *
 * ส่งมาแค่ id ทาง URL แล้วอ่านชื่อกับราคาจากฐานข้อมูลที่นี่
 * ไม่ส่งราคามาทาง query string เพราะแก้ได้จากแถบที่อยู่ และทำให้ URL ยาวโดยไม่จำเป็น
 */
export const getPackageForQuote = cache((id: string) =>
  safe(
    'package-for-quote',
    () =>
      db.servicePackage.findFirst({
        where: { id, isActive: true },
        select: {
          id: true,
          nameTh: true,
          nameEn: true,
          priceFrom: true,
          priceUnit: true,
          isStartingPrice: true,
          service: { select: { category: true, titleTh: true, titleEn: true } },
        },
      }),
    null,
  ),
)

// ─────────────────────────── หน้าแรก ───────────────────────────

/**
 * บริการพร้อมจุดเด่นและแพ็กเกจที่ราคาเริ่มต้นต่ำสุดหนึ่งชุด
 * หน้าแรกใช้ทำรายการราคาย่อ ส่วนจุดเด่นของบริการสตูดิโอใช้บอกว่าในสตูดิโอมีอะไร
 */
export const getHomeServices = cache(() =>
  safe(
    'home-services',
    () =>
      db.service.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          ...serviceCardSelect,
          highlightsTh: true,
          highlightsEn: true,
          packages: {
            where: { isActive: true },
            orderBy: [{ priceFrom: { sort: 'asc', nulls: 'last' } }, { order: 'asc' }],
            take: 1,
            select: { priceFrom: true, priceUnit: true },
          },
        },
      }),
    [],
  ),
)

/** งานดิจิทัลหนึ่งชิ้นพร้อมภาพหน้าจอ ผลงานเด่นมาก่อน */
export const getHomeDigitalCase = cache(() =>
  safe(
    'home-digital-case',
    () =>
      db.project.findFirst({
        where: { ...publicProjectWhere, category: { in: ['WEB', 'WEB_APP', 'MOBILE_APP'] } },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { order: 'asc' }],
        select: {
          ...projectCardSelect,
          liveUrl: true,
          techStack: true,
          media: {
            where: { type: 'IMAGE' },
            orderBy: { order: 'asc' },
            take: 6,
            select: { id: true, url: true, altTh: true, altEn: true },
          },
        },
      }),
    null,
  ),
)

/** งานภาพที่มีภาพให้วางโมเสกได้ ผลงานเด่นมาก่อน ดึงทั้งชุด (สูงสุด 40 ภาพ) เพื่อให้หน้าแรกหยิบกระจายได้ทั่วชุด */
export const getHomePhotos = cache(() =>
  safe(
    'home-photos',
    () =>
      db.project.findMany({
        where: { ...publicProjectWhere, category: { in: ['PHOTOGRAPHY', 'VIDEO'] } },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { order: 'asc' }],
        take: 3,
        select: {
          slug: true,
          titleTh: true,
          titleEn: true,
          coverImage: true,
          media: { where: { type: 'IMAGE' }, orderBy: { order: 'asc' }, take: 40, select: { url: true } },
        },
      }),
    [],
  ),
)
