import type { Locale } from '@/i18n/routing'

/** Prisma คืน Decimal เป็นอ็อบเจกต์ ไม่ใช่ number — ต้องแปลงก่อนใช้เสมอ */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const intlLocale = (locale: Locale) => (locale === 'th' ? 'th-TH' : 'en-US')

/** ราคาแบบไม่มีทศนิยม เพราะงานบริการในไทยไม่เคยคิดเป็นสตางค์ */
export function formatPrice(value: unknown, locale: Locale): string | null {
  const n = toNumber(value)
  if (n === null) return null

  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value)
}

export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatMonthYear(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', year: 'numeric' }).format(d)
}

/**
 * ดึง id วิดีโอจากลิงก์ YouTube/Vimeo ทุกรูปแบบที่ลูกค้ามักส่งมา
 * (youtu.be, /watch?v=, /embed/, /shorts/, vimeo.com/123456)
 */
export type VideoSource = { provider: 'youtube' | 'vimeo'; id: string } | null

/**
 * id ที่แกะได้จะถูกต่อเข้าไปใน src ของ iframe และ URL ของ thumbnail ตรง ๆ
 * ถ้าไม่จำกัดอักขระ ค่าอย่าง `abc?x=1` หรือ `../../something` จะเปลี่ยนปลายทางที่ฝังจริง
 * ไปจากที่ตั้งใจ ทั้งที่ยังอยู่บนโดเมนของ YouTube — จำกัดให้เหลือเฉพาะชุดอักขระของ id จริง
 */
const VIDEO_ID = /^[A-Za-z0-9_-]{1,24}$/

function asVideoId(value: string | undefined): string | null {
  return value && VIDEO_ID.test(value) ? value : null
}

export function parseVideoUrl(url: string | null | undefined): VideoSource {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = asVideoId(parsed.pathname.slice(1))
      return id ? { provider: 'youtube', id } : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const fromQuery = asVideoId(parsed.searchParams.get('v') ?? undefined)
      if (fromQuery) return { provider: 'youtube', id: fromQuery }

      const match = parsed.pathname.match(/^\/(?:embed|shorts|v)\/([^/?]+)/)
      const id = asVideoId(match?.[1])
      return id ? { provider: 'youtube', id } : null
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const match = parsed.pathname.match(/(\d+)/)
      return match ? { provider: 'vimeo', id: match[1] } : null
    }

    return null
  } catch {
    return null
  }
}

export function videoEmbedUrl(source: NonNullable<VideoSource>): string {
  return source.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${source.id}?rel=0`
    : `https://player.vimeo.com/video/${source.id}`
}

export function videoThumbnailUrl(source: NonNullable<VideoSource>): string | null {
  // Vimeo ต้องเรียก API ถึงจะได้ thumbnail จึงคืน null แล้วให้ผู้ใช้ตั้ง coverImage เอง
  return source.provider === 'youtube'
    ? `https://i.ytimg.com/vi/${source.id}/maxresdefault.jpg`
    : null
}

/**
 * ชื่ออุปกรณ์ที่เอาไปแสดงและส่งให้ Google — "ยี่ห้อ + รุ่น"
 *
 * ช่องยี่ห้อเป็นช่องกรอกอิสระในหลังบ้าน ของจริงมีแถวที่กรอกไว้เป็นขีดกลางเพราะไม่รู้ยี่ห้อ
 * ถ้าต่อตรง ๆ จะได้ชื่อว่า "- softbox parabolico" ทั้งบนหน้าเว็บ ในผลค้นหา และใน JSON-LD
 *
 * ถือว่ายี่ห้อ "มีอยู่จริง" ต่อเมื่อมีตัวอักษรหรือตัวเลขอย่างน้อยหนึ่งตัว
 * ที่เหลือ (ขีด, จุด, ช่องว่าง) คือวิธีที่คนกรอกใช้บอกว่า "ไม่มี" — ไม่ใช่ชื่อยี่ห้อ
 */
export function equipmentBrand(brand: string | null | undefined): string | null {
  const value = brand?.trim()
  return value && /[\p{L}\p{N}]/u.test(value) ? value : null
}

export function equipmentName(brand: string | null | undefined, model: string): string {
  const prefix = equipmentBrand(brand)
  return prefix ? `${prefix} ${model}` : model
}
