import type { MetadataRoute } from 'next'
import { locales, localizedPath } from '@/i18n/routing'
import { clientEnv } from '@/lib/env'
import {
  getEquipmentSlugs,
  getPostSlugs,
  getProjectSlugs,
  getServiceSlugs,
} from '@/server/queries'

const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
export const dynamic = 'force-dynamic'

/**
 * ทุก URL มีทั้งเวอร์ชันไทยและอังกฤษ
 * ต้องบอก Google ด้วย alternates ว่าสองหน้านี้คือเนื้อหาเดียวกันคนละภาษา
 * ไม่งั้นจะถูกมองว่าเป็นเนื้อหาซ้ำและกดอันดับกันเอง
 */
function withAlternates(
  path: string,
  options: {
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']
    priority?: number
    /**
     * วันที่แก้ล่าสุดของหน้านั้นจริง ๆ
     *
     * ใส่เฉพาะหน้าที่รู้วันจริงจากฐานข้อมูล ไม่ใส่ new Date() ให้ทุกหน้า
     * การบอกว่า "ทุกหน้าเพิ่งแก้เมื่อกี้" ทุกครั้งที่ Google มาขอ sitemap
     * ทำให้ค่านี้ไม่มีความหมาย แล้ว Google จะเลิกใช้มันกับทั้งเว็บ
     */
    lastModified?: Date
  } = {},
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `${siteUrl}${localizedPath(locale, path)}`]),
  )

  return locales.map((locale) => ({
    url: `${siteUrl}${localizedPath(locale, path)}`,
    changeFrequency: options.changeFrequency ?? 'monthly',
    priority: options.priority ?? 0.6,
    ...(options.lastModified ? { lastModified: options.lastModified } : {}),
    alternates: { languages },
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects, posts, equipment] = await Promise.all([
    getServiceSlugs(),
    getProjectSlugs(),
    getPostSlugs(),
    getEquipmentSlugs(),
  ])

  return [
    ...withAlternates('', { changeFrequency: 'weekly', priority: 1 }),
    ...withAlternates('/services', { changeFrequency: 'monthly', priority: 0.9 }),
    ...withAlternates('/work', { changeFrequency: 'weekly', priority: 0.9 }),
    ...withAlternates('/rental', { changeFrequency: 'weekly', priority: 0.8 }),
    ...withAlternates('/reviews', { changeFrequency: 'weekly', priority: 0.7 }),
    ...withAlternates('/blog', { changeFrequency: 'weekly', priority: 0.7 }),
    ...withAlternates('/about', { priority: 0.6 }),
    ...withAlternates('/contact', { priority: 0.8 }),
    // หน้ากฎหมายไม่ได้ช่วยเรื่องอันดับ แต่ Google ใช้ประกอบการตัดสินว่าเว็บนี้เป็นธุรกิจจริง
    ...withAlternates('/privacy', { changeFrequency: 'yearly', priority: 0.2 }),
    ...withAlternates('/terms', { changeFrequency: 'yearly', priority: 0.2 }),

    ...services.flatMap((s) =>
      withAlternates(`/services/${s.slug}`, { priority: 0.8, lastModified: s.updatedAt }),
    ),
    ...projects.flatMap((p) =>
      withAlternates(`/work/${p.slug}`, { priority: 0.7, lastModified: p.updatedAt }),
    ),
    ...posts.flatMap((p) =>
      withAlternates(`/blog/${p.slug}`, { priority: 0.6, lastModified: p.updatedAt }),
    ),
    /**
     * หน้าอุปกรณ์รายชิ้นให้น้ำหนักเท่าหน้าบริการ
     * เป็นหน้าที่ตรงกับคำค้นที่ตั้งใจจะเช่าจริง ("เช่า <ยี่ห้อ> <รุ่น> ราคา")
     * ซึ่งมีโอกาสจบเป็นลูกค้าสูงกว่าหน้ารวมที่กว้างกว่า
     */
    ...equipment.flatMap((e) =>
      withAlternates(`/rental/${e.slug}`, {
        changeFrequency: 'weekly',
        priority: 0.8,
        lastModified: e.updatedAt,
      }),
    ),
  ]
}
