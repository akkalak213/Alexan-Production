import { cache } from 'react'
import type { EquipmentCategory, ServiceCategory } from '@/generated/prisma/enums'
import { db } from '@/lib/db'
import { publicProjectWhere, publicReviewWhere } from '@/lib/sample-content'
import { cachedQuery } from './cache'

/**
 * Query ทั้งหมดของหน้าเว็บสาธารณะ
 *
 * Failed reads reach the localized retry boundary; empty states mean a successful read with no records.
 * แต่ยัง log ทุกครั้งเพื่อให้จับปัญหาได้จาก log ของ Railway
 *
 * ทุกตัวห่อสามชั้น จากนอกเข้าใน
 *   cache ของ React   กันอ่านซ้ำในคำขอเดียว เช่น layout กับ page อ่านค่าเดียวกัน
 *   cachedQuery       เก็บผลข้ามคำขอ ล้างด้วยแท็กเมื่อหลังบ้านบันทึก (ดู server/cache.ts)
 *   safe              log แล้วโยนต่อ ความผิดพลาดจึงไม่ถูกเก็บลงแคช
 *
 * แท็กต้องครอบทุกตารางที่ผลลัพธ์แสดง ไม่ใช่แค่ตารางหลัก
 * เช่นหน้ารายละเอียดผลงานแสดงชื่อบริการด้วย จึงติดทั้ง projects และ services
 */
async function safe<T>(label: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    console.error(`[query:${label}] อ่านฐานข้อมูลไม่สำเร็จ`, error)
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

export const getActiveServices = cache(
  cachedQuery('services:active', ['services'], () =>
    safe('services', () =>
      db.service.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: serviceCardSelect,
      }),
    ),
  ),
)

export const getServiceBySlug = cache(
  cachedQuery('services:detail', ['services'], (slug: string) =>
    safe('service-detail', () =>
      db.service.findFirst({
        where: { slug, isActive: true },
        include: {
          packages: { where: { isActive: true }, orderBy: { order: 'asc' } },
        },
      }),
    ),
  ),
)

export const getServiceSlugs = cache(
  cachedQuery('services:slugs', ['services'], () =>
    safe('service-slugs', () =>
      db.service.findMany({
        where: { isActive: true },
        // updatedAt ไปเป็น lastmod ใน sitemap — Google ใช้ตัดสินว่าควรกลับมาเก็บหน้านี้ใหม่เมื่อไหร่
        select: { slug: true, updatedAt: true },
      }),
    ),
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

export const getProjects = cache(
  cachedQuery('projects:list', ['projects'], (category?: ServiceCategory) =>
    safe('projects', () =>
      db.project.findMany({
        where: { ...publicProjectWhere, ...(category ? { category } : {}) },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { order: 'asc' }],
        select: projectCardSelect,
      }),
    ),
  ),
)

export const getFeaturedProjects = cache(
  cachedQuery('projects:featured', ['projects'], (take: number = 4) =>
    safe('featured-projects', () =>
      db.project.findMany({
        where: { ...publicProjectWhere, isFeatured: true },
        orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
        take,
        select: projectCardSelect,
      }),
    ),
  ),
)

export const getProjectBySlug = cache(
  cachedQuery('projects:detail', ['projects', 'services'], (slug: string) =>
    safe('project-detail', () =>
      db.project.findFirst({
        where: { slug, ...publicProjectWhere },
        include: {
          media: { orderBy: { order: 'asc' } },
          service: { select: { slug: true, titleTh: true, titleEn: true } },
        },
      }),
    ),
  ),
)

export const getProjectSlugs = cache(
  cachedQuery('projects:slugs', ['projects'], () =>
    safe('project-slugs', () =>
      db.project.findMany({
        where: { ...publicProjectWhere },
        select: { slug: true, updatedAt: true },
      }),
    ),
  ),
)

export const getRelatedProjects = cache(
  cachedQuery(
    'projects:related',
    ['projects'],
    (category: ServiceCategory, excludeId: string, take: number = 3) =>
      safe('related-projects', () =>
        db.project.findMany({
          where: { ...publicProjectWhere, category, id: { not: excludeId } },
          orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
          take,
          select: projectCardSelect,
        }),
      ),
  ),
)

export const getProjectCountsByCategory = cache(
  cachedQuery('projects:counts', ['projects'], () =>
    safe('project-counts', async () => {
      const rows = await db.project.groupBy({
        by: ['category'],
        where: { ...publicProjectWhere },
        _count: { _all: true },
      })
      return Object.fromEntries(rows.map((r) => [r.category, r._count._all])) as Partial<
        Record<ServiceCategory, number>
      >
    }),
  ),
)

// ─────────────────────── อุปกรณ์ให้เช่า ───────────────────────

export const getEquipment = cache(
  cachedQuery('equipment:list', ['equipment'], (category?: EquipmentCategory) =>
    safe('equipment', () =>
      db.equipment.findMany({
        where: { isActive: true, ...(category ? { category } : {}) },
        orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }],
      }),
    ),
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
export const getEquipmentByIds = cache(
  cachedQuery('equipment:by-ids', ['equipment'], (ids: string[]) =>
    safe('equipment-by-ids', () =>
      ids.length
        ? db.equipment.findMany({
            where: { id: { in: ids }, isActive: true },
            orderBy: [{ category: 'asc' }, { order: 'asc' }],
          })
        : Promise.resolve([]),
    ),
  ),
)

export const getEquipmentBySlug = cache(
  cachedQuery('equipment:detail', ['equipment'], (slug: string) =>
    safe('equipment-detail', () => db.equipment.findFirst({ where: { slug, isActive: true } })),
  ),
)

export const getEquipmentSlugs = cache(
  cachedQuery('equipment:slugs', ['equipment'], () =>
    safe('equipment-slugs', () =>
      db.equipment.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ),
  ),
)

/**
 * อุปกรณ์อื่นในหมวดเดียวกัน ใช้ท้ายหน้ารายละเอียด
 *
 * นอกจากช่วยให้ลูกค้าเทียบของได้ต่อ ยังเป็นการเชื่อมหน้ารายละเอียดเข้าหากันเอง
 * หน้าที่มีแต่ลิงก์เข้าไม่มีลิงก์ออกจะถูกมองว่าเป็นทางตัน และได้น้ำหนักน้อยกว่าที่ควร
 */
export const getRelatedEquipment = cache(
  cachedQuery(
    'equipment:related',
    ['equipment'],
    (category: EquipmentCategory, excludeId: string, take: number = 3) =>
      safe('equipment-related', () =>
        db.equipment.findMany({
          where: { isActive: true, category, id: { not: excludeId } },
          orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }],
          take,
        }),
      ),
  ),
)

export const getEquipmentCountsByCategory = cache(
  cachedQuery('equipment:counts', ['equipment'], () =>
    safe('equipment-counts', async () => {
      const rows = await db.equipment.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { _all: true },
      })
      return Object.fromEntries(rows.map((r) => [r.category, r._count._all])) as Partial<
        Record<EquipmentCategory, number>
      >
    }),
  ),
)

// ─────────────────────────── รีวิว ───────────────────────────

export const getApprovedReviews = cache(
  cachedQuery('reviews:approved', ['reviews'], (take?: number) =>
    safe('reviews', () =>
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
    ),
  ),
)

export const getReviewStats = cache(
  cachedQuery('reviews:stats', ['reviews'], () =>
    safe('review-stats', async () => {
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
    }),
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

export const getPosts = cache(
  cachedQuery('posts:list', ['posts'], (take?: number) =>
    safe('posts', () =>
      db.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        ...(take ? { take } : {}),
        select: postCardSelect,
      }),
    ),
  ),
)

export const getPostBySlug = cache(
  cachedQuery('posts:detail', ['posts', 'team'], (slug: string) =>
    safe('post-detail', () =>
      db.post.findFirst({
        where: { slug, status: 'PUBLISHED' },
        include: { author: { select: { name: true, avatarUrl: true } } },
      }),
    ),
  ),
)

export const getPostSlugs = cache(
  cachedQuery('posts:slugs', ['posts'], () =>
    safe('post-slugs', () =>
      db.post.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
    ),
  ),
)

// ─────────────────────────── ทีมงาน ───────────────────────────

export const getTeamMembers = cache(
  cachedQuery('team:active', ['team'], () =>
    safe('team', () => db.teamMember.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } })),
  ),
)

// ─────────────────────── สถิติหน้าแรก ───────────────────────

export const getHomeStats = cache(
  cachedQuery('home:stats', ['projects', 'reviews'], () =>
    safe('home-stats', async () => {
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
    }),
  ),
)

/**
 * แพ็กเกจที่ลูกค้ากดมาจากหน้าบริการ เพื่อเอาไปแสดงบนหน้าขอใบเสนอราคา
 *
 * ส่งมาแค่ id ทาง URL แล้วอ่านชื่อกับราคาจากฐานข้อมูลที่นี่
 * ไม่ส่งราคามาทาง query string เพราะแก้ได้จากแถบที่อยู่ และทำให้ URL ยาวโดยไม่จำเป็น
 */
export const getPackageForQuote = cache(
  cachedQuery('services:package', ['services'], (id: string) =>
    safe('package-for-quote', () =>
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
    ),
  ),
)

// ─────────────────────────── หน้าแรก ───────────────────────────

/**
 * บริการพร้อมจุดเด่นและแพ็กเกจที่ราคาเริ่มต้นต่ำสุดหนึ่งชุด
 * หน้าแรกใช้ทำรายการราคาย่อ ส่วนจุดเด่นของบริการสตูดิโอใช้บอกว่าในสตูดิโอมีอะไร
 */
export const getHomeServices = cache(
  cachedQuery('home:services', ['services'], () =>
    safe('home-services', () =>
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
    ),
  ),
)

/** งานดิจิทัลหนึ่งชิ้นพร้อมภาพหน้าจอ ผลงานเด่นมาก่อน */
export const getHomeDigitalCase = cache(
  cachedQuery('home:digital-case', ['projects'], () =>
    safe('home-digital-case', () =>
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
    ),
  ),
)

/** งานภาพที่มีภาพให้วางโมเสกได้ ผลงานเด่นมาก่อน ดึงทั้งชุด (สูงสุด 40 ภาพ) เพื่อให้หน้าแรกหยิบกระจายได้ทั่วชุด */
export const getHomePhotos = cache(
  cachedQuery('home:photos', ['projects'], () =>
    safe('home-photos', () =>
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
    ),
  ),
)
