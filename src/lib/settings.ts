import { cache } from 'react'
import { cachedQuery } from '@/server/cache'
import { db } from './db'

/**
 * ค่าตั้งค่าเว็บที่แก้ได้จากหลังบ้าน
 *
 * ถ้าต่อฐานข้อมูลไม่ได้ (เช่น เพิ่ง clone มายังไม่ได้ตั้ง DATABASE_URL) จะคืนค่า default
 * แทนที่จะทำให้ทั้งหน้าเว็บพัง — ทีมจะได้เปิด npm run dev ดูงานได้ทันที
 */

export type CompanySettings = {
  nameTh: string
  nameEn: string
  legalNameTh: string
  taxId: string
  addressTh: string
  addressEn: string
  email: string
  phone: string
  lineId: string
  openingHoursTh: string
  openingHoursEn: string
  mapUrl: string
  latitude: number
  longitude: number
}

export type SocialSettings = {
  facebook: string
  instagram: string
  youtube: string
  tiktok: string
  line: string
}

export type HeroSettings = {
  eyebrowTh: string
  eyebrowEn: string
  headlineTh: string
  headlineEn: string
  subheadlineTh: string
  subheadlineEn: string
}

export type SiteSettings = {
  company: CompanySettings
  social: SocialSettings
  hero: HeroSettings
}

/**
 * ค่าตั้งต้นของใบเสนอราคา
 *
 * หน้าเว็บสาธารณะต้องใช้ด้วย ไม่ใช่แค่หลังบ้าน เพราะใบเสนอราคาเบื้องต้นที่ลูกค้ากดเอง
 * ต้องคิด VAT ยืนราคา และแสดงเงื่อนไขด้วยค่าชุดเดียวกับที่ทีมขายใช้ออกเอกสารจริง
 */
export type QuoteDefaults = {
  defaultValidDays: number
  defaultVatRate: number
  termsTh: string
  termsEn: string
}

const quoteDefaults: QuoteDefaults = {
  defaultValidDays: 30,
  defaultVatRate: 7,
  termsTh: '',
  termsEn: '',
}

const defaults: SiteSettings = {
  company: {
    nameTh: 'อเล็กซาน โปรดักชั่น',
    nameEn: 'Alexan Production',
    legalNameTh: 'บริษัท อเล็กซาน โปรดักชั่น จำกัด',
    taxId: '',
    addressTh: 'ปากพนัง นครศรีธรรมราช',
    addressEn: 'Pak Phanang, Nakhon Si Thammarat',
    email: 'akkalak213@gmail.com',
    phone: '',
    lineId: '',
    openingHoursTh: 'เปิดทุกวัน 09.00 – 22.00 น.',
    openingHoursEn: 'Open daily, 09:00 – 22:00',
    mapUrl: '',
    latitude: 8.3517,
    longitude: 100.2003,
  },
  social: { facebook: '', instagram: '', youtube: '', tiktok: '', line: '' },
  hero: {
    eyebrowTh: 'รับทำเว็บ ถ่ายภาพ ถ่ายวิดีโอ',
    eyebrowEn: 'Websites, photography, film',
    headlineTh: 'เว็บไซต์และงานภาพ ที่เล่าเรื่องธุรกิจคุณ',
    headlineEn: 'Websites and visuals for your business.',
    subheadlineTh:
      'ไม่ต้องหาช่างภาพเจ้าหนึ่ง คนทำเว็บอีกเจ้าหนึ่ง แล้วมานั่งประสานเอง เราทำให้ทั้งหมดและคุณคุยกับเราที่เดียว',
    subheadlineEn:
      'No hiring a photographer here and a developer there, then coordinating them yourself. We do both, and you talk to one team.',
  },
}

/**
 * อ่านค่าตั้งค่าหลายกลุ่มในครั้งเดียว ผลถูกแคชข้ามคำขอและล้างเมื่อบันทึกหน้าตั้งค่า
 * ข้อมูลบริษัทอยู่ใน layout ของทุกหน้า เดิมจึงเป็นคำสั่งฐานข้อมูลที่ถูกยิงบ่อยที่สุดของทั้งเว็บ
 */
const readSettings = cachedQuery('settings', ['settings'], (keys: string[]) =>
  db.siteSetting.findMany({ where: { key: { in: keys } } }),
)

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await readSettings(['company', 'social', 'hero'])

    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>

    const hero = { ...defaults.hero, ...(byKey.hero as Partial<HeroSettings>) }
    if (['เราสร้างสิ่งที่ธุรกิจคุณต้องใช้จริง', 'งานเว็บกับงานภาพ จบที่ทีมเดียว'].includes(hero.headlineTh)) hero.headlineTh = 'เว็บไซต์และงานภาพ ที่เล่าเรื่องธุรกิจคุณ'
    if (['We build what your business actually needs', 'The web side and the visual side, one team'].includes(hero.headlineEn)) hero.headlineEn = 'Websites and visuals for your business.'
    return {
      company: { ...defaults.company, ...(byKey.company as Partial<CompanySettings>) },
      social: { ...defaults.social, ...(byKey.social as Partial<SocialSettings>) },
      hero,
    }
  } catch {
    // ยังไม่ได้ตั้งฐานข้อมูล หรือฐานข้อมูลล่ม — แสดงค่า default ไปก่อน
    return defaults
  }
})

export const getQuoteDefaults = cache(async (): Promise<QuoteDefaults> => {
  try {
    const [row] = await readSettings(['quote'])
    const stored = (row?.value ?? {}) as Partial<QuoteDefaults>

    return {
      // ค่าที่กรอกในหลังบ้านเป็น JSON จึงไม่มีอะไรรับประกันชนิด ต้องแปลงเองทุกตัว
      defaultValidDays: Number(stored.defaultValidDays) || quoteDefaults.defaultValidDays,
      defaultVatRate: Number(stored.defaultVatRate ?? quoteDefaults.defaultVatRate),
      termsTh: String(stored.termsTh ?? ''),
      termsEn: String(stored.termsEn ?? ''),
    }
  } catch {
    return quoteDefaults
  }
})
