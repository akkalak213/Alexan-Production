import { localizedPath, type Locale } from '@/i18n/routing'
import type { SiteSettings } from './settings'
import { clientEnv } from './env'
import { safeExternalUrl } from './external-link'
import { equipmentBrand } from './format'
import { parseOpeningHours, parseThaiAddress } from './thai-business-info'

/**
 * JSON-LD สำหรับ Google
 *
 * สำคัญกับธุรกิจ SME มาก เพราะทำให้ขึ้นผลค้นหาแบบมีดาว มีที่อยู่ และมีเวลาทำการ
 * ทุก builder คืน object ธรรมดา ให้เอาไปใส่ <JsonLd> อีกที
 */

const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

export const absoluteUrl = (path: string) => `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`

/** โลโก้ที่ Google ดึงไปแสดงข้าง ๆ ผลค้นหาและใน knowledge panel */
const logoUrl = absoluteUrl('/logo.png')

/**
 * ตัวอ้างถึงกิจการที่ประกาศไว้ครั้งเดียวที่ layout
 *
 * ทุกหน้าชี้กลับมาที่ก้อนเดียวกันด้วย @id แทนที่จะประกาศข้อมูลบริษัทซ้ำในทุกหน้า
 * เครื่องมือค้นหาจะได้เห็นเป็น "กิจการเดียวที่มีหลายหน้า" ไม่ใช่ "หลายกิจการที่ชื่อเหมือนกัน"
 */
export const organizationRef = { '@id': `${siteUrl}/#organization` } as const

/**
 * ชื่อบริการทั้งหกที่รับทำ ส่งมาจากไฟล์ข้อความของภาษานั้น (namespace `serviceCategory`)
 * ไม่ฮาร์ดโค้ดซ้ำไว้ในนี้ เพราะถ้าวันหนึ่งแก้ชื่อบริการในเมนู แล้วลืมแก้ตรงนี้
 * สิ่งที่บอก Google กับสิ่งที่คนเห็นบนหน้าเว็บจะไม่ตรงกันโดยไม่มีใครรู้
 */
export function organizationSchema(
  settings: SiteSettings,
  locale: Locale,
  serviceNames: string[] = [],
) {
  const { company, social } = settings
  const isThai = locale === 'th'

  /**
   * sameAs คือรายการโปรไฟล์อื่นที่เป็น "ตัวเราคนเดียวกัน"
   * Google กับเครื่องมือค้นหาที่ใช้ AI ใช้รายการนี้ยืนยันว่าแบรนด์นี้มีตัวตนจริงนอกเว็บตัวเอง
   * ไม่ใช่แค่หน้าเว็บที่ใครก็สร้างได้ — ยิ่งเชื่อมได้หลายที่ ยิ่งถูกหยิบไปตอบมากขึ้น
   *
   * กรอง scheme ด้วย safeExternalUrl เหมือนที่ฟุตเตอร์ทำ ค่าที่กรอกมาแต่ชื่อบัญชี
   * (ไม่ใช่ URL เต็ม) จะถูกตัดออก ดีกว่าส่ง JSON-LD ที่มีค่าผิดรูปให้ Google อ่าน
   */
  const sameAs = [social.facebook, social.instagram, social.youtube, social.tiktok, social.line]
    .map((value) => safeExternalUrl(value))
    .filter((value): value is string => value !== null)

  const address = parseThaiAddress(isThai ? company.addressTh : company.addressEn)
  const openingHours = parseOpeningHours(isThai ? company.openingHoursTh : company.openingHoursEn)

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${siteUrl}/#organization`,
    name: isThai ? company.nameTh : company.nameEn,
    legalName: company.legalNameTh || undefined,
    url: absoluteUrl(localizedPath(locale)),
    description: isThai ? settings.hero.subheadlineTh : settings.hero.subheadlineEn,
    email: company.email || undefined,
    telephone: company.phone || undefined,
    taxID: company.taxId || undefined,
    /**
     * logo กับ image ต้องมีทั้งคู่และเป็น URL เต็ม
     * logo คือรูปที่ Google เอาไปวางใน knowledge panel ส่วน image คือรูปประกอบผลค้นหา
     * ขาดไปแล้วผลค้นหาจะเป็นตัวหนังสือล้วน ไม่มีอะไรบอกว่าเป็นแบรนด์ไหน
     */
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
      width: 512,
      height: 512,
    },
    image: logoUrl,
    priceRange: '฿฿',
    currenciesAccepted: 'THB',
    /**
     * เวลาทำการต้องเป็นรูปแบบตายตัวของ schema.org ไม่ใช่ประโยคภาษาไทย
     * ของเดิมส่ง "เปิดทุกวัน 09.00 – 22.00 น." ไปตรง ๆ ซึ่ง Google อ่านไม่ออกแล้วข้ามทิ้ง
     * ประโยคที่แกะไม่ออกจะไม่ประกาศเลย — ดีกว่าประกาศเวลาที่ผิด
     */
    ...(openingHours
      ? {
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: openingHours.dayOfWeek,
            opens: openingHours.opens,
            closes: openingHours.closes,
          },
        }
      : {}),
    areaServed: { '@type': 'Country', name: 'Thailand' },
    ...(sameAs.length ? { sameAs } : {}),
    /**
     * ชื่อที่คนพิมพ์หาจริง ไม่ใช่แค่ชื่อทางการ
     * คนไทยพิมพ์ทั้ง "Alexan" "อเล็กซาน" และชื่อเต็ม — ประกาศไว้ให้ครบ
     * เครื่องมือค้นหาจะได้รู้ว่าทั้งหมดหมายถึงกิจการเดียวกัน ไม่ใช่คนละแบรนด์
     */
    alternateName: Array.from(
      new Set([company.nameTh, company.nameEn, 'Alexan', 'อเล็กซาน'].filter(Boolean)),
    ),
    /**
     * ช่องทางติดต่อแบบมีโครงสร้าง แยกจาก telephone เปล่า ๆ ข้างบน
     * ตัวนี้คือสิ่งที่ AI หยิบไปตอบเวลามีคนถามว่า "ติดต่อยังไง" พร้อมบอกว่าคุยภาษาอะไรได้
     */
    ...(company.phone || company.email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'sales',
            ...(company.phone ? { telephone: company.phone } : {}),
            ...(company.email ? { email: company.email } : {}),
            availableLanguage: ['th', 'en'],
            areaServed: 'TH',
          },
        }
      : {}),
    /**
     * ที่อยู่ที่แยกเป็นส่วน ๆ ไม่ใช่ข้อความก้อนเดียวยัดลง streetAddress
     * การค้นหาที่ระบุพื้นที่ ("รับทำเว็บ นครศรีธรรมราช") อาศัยจังหวัดกับอำเภอที่แยกออกมาแล้ว
     * ส่วนที่แกะไม่ออกจะไม่ถูกใส่ ไม่ใช่เดาให้
     */
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      ...(address.addressLocality ? { addressLocality: address.addressLocality } : {}),
      ...(address.addressRegion ? { addressRegion: address.addressRegion } : {}),
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
      addressCountry: 'TH',
    },
    ...(company.latitude && company.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: company.latitude,
            longitude: company.longitude,
          },
        }
      : {}),
    // บริการทั้งหกอย่างที่รับทำ ช่วยให้ Google จับคู่กับคำค้นได้ตรงขึ้น
    ...(serviceNames.length ? { knowsAbout: serviceNames } : {}),
    /**
     * รายการบริการแบบมีโครงสร้าง ต่างจาก knowsAbout ที่เป็นแค่ "หัวข้อที่เราถนัด"
     * ตัวนี้ประกาศว่า "นี่คือของที่ขาย" ซึ่งเป็นสิ่งที่เครื่องมือค้นหาแบบ AI มองหา
     * เวลามีคนถามว่า "ที่ไหนรับทำ X" แล้วต้องตัดสินใจว่าจะหยิบใครมาตอบ
     */
    ...(serviceNames.length
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: isThai ? 'บริการของ Alexan Production' : 'Alexan Production services',
            itemListElement: serviceNames.map((name) => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name,
                provider: { '@id': `${siteUrl}/#organization` },
                areaServed: { '@type': 'Country', name: 'Thailand' },
              },
            })),
          },
        }
      : {}),
  }
}

export function websiteSchema(settings: SiteSettings, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: absoluteUrl(localizedPath(locale)),
    name: locale === 'th' ? settings.company.nameTh : settings.company.nameEn,
    description: locale === 'th' ? settings.hero.subheadlineTh : settings.hero.subheadlineEn,
    inLanguage: locale === 'th' ? 'th-TH' : 'en-US',
    publisher: { '@id': `${siteUrl}/#organization` },
  }
}

export function aggregateRatingSchema(average: number, total: number) {
  // Google ไม่แสดงดาวถ้าไม่มีรีวิวจริง — อย่าใส่ schema เปล่า
  if (total === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    '@id': `${siteUrl}/#rating`,
    itemReviewed: { '@id': `${siteUrl}/#organization` },
    ratingValue: Number(average.toFixed(1)),
    bestRating: 5,
    worstRating: 1,
    ratingCount: total,
  }
}

export function serviceSchema({
  name,
  description,
  slug,
  locale,
  lowPrice,
}: {
  name: string
  description: string
  slug: string
  locale: Locale
  lowPrice: number | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: absoluteUrl(localizedPath(locale, `/services/${slug}`)),
    provider: { '@id': `${siteUrl}/#organization` },
    areaServed: { '@type': 'Country', name: 'Thailand' },
    ...(lowPrice
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'THB',
            price: lowPrice,
            priceSpecification: {
              '@type': 'PriceSpecification',
              minPrice: lowPrice,
              priceCurrency: 'THB',
            },
          },
        }
      : {}),
  }
}

export function articleSchema({
  title,
  description,
  slug,
  locale,
  image,
  publishedAt,
  updatedAt,
  authorName,
}: {
  title: string
  description: string
  slug: string
  locale: Locale
  image: string | null
  publishedAt: Date | null
  updatedAt: Date
  authorName: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url: absoluteUrl(localizedPath(locale, `/blog/${slug}`)),
    mainEntityOfPage: absoluteUrl(localizedPath(locale, `/blog/${slug}`)),
    ...(image ? { image: [image] } : {}),
    datePublished: publishedAt?.toISOString(),
    dateModified: updatedAt.toISOString(),
    inLanguage: locale === 'th' ? 'th-TH' : 'en-US',
    author: authorName
      ? { '@type': 'Person', name: authorName }
      : { '@id': `${siteUrl}/#organization` },
    publisher: {
      '@id': `${siteUrl}/#organization`,
      // Google ต้องการ publisher.logo ตรงนี้ด้วย ไม่ยอมตามไปอ่านจาก @id อย่างเดียว
      logo: { '@type': 'ImageObject', url: logoUrl },
    },
  }
}

export function creativeWorkSchema({
  title,
  description,
  slug,
  locale,
  image,
  year,
  clientName,
}: {
  title: string
  description: string
  slug: string
  locale: Locale
  image: string | null
  year: number | null
  clientName: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: title,
    description,
    url: absoluteUrl(localizedPath(locale, `/work/${slug}`)),
    // ผลงานที่รูปปกว่างต้องไม่ส่ง image: [''] ออกไป — Google อ่านแล้วตีเป็นข้อมูลผิดรูป
    ...(image ? { image: [image] } : {}),
    ...(year ? { dateCreated: String(year) } : {}),
    creator: { '@id': `${siteUrl}/#organization` },
    ...(clientName ? { sourceOrganization: { '@type': 'Organization', name: clientName } } : {}),
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function faqSchema(items: { question: string; answer: string }[]) {
  if (items.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

// ──────────────────── หน้ารวมรายการ ────────────────────

/**
 * หน้าที่เป็น "รายการของ" — ผลงาน บริการ อุปกรณ์ บทความ รีวิว
 *
 * เดิมหกหน้านี้ไม่มี JSON-LD เลยสักตัว มีแต่หน้ารายละเอียด
 * ผลคือเครื่องมือค้นหาเห็นหน้ารวมเป็นแค่ข้อความกองหนึ่ง ไม่รู้ว่าข้างในมีอะไรกี่ชิ้น
 * และไม่รู้ว่าหน้านี้อยู่ตรงไหนของเว็บ (จึงไม่มี breadcrumb ขึ้นในผลค้นหา)
 *
 * ItemList บอกทั้งจำนวนและลำดับ ซึ่งเป็นสิ่งที่เครื่องมือค้นหาแบบ AI ใช้ตัดสินว่า
 * หน้านี้ตอบคำถาม "มีอะไรให้เลือกบ้าง" ได้จริงหรือเปล่า
 */
export function collectionPageSchema({
  name,
  description,
  path,
  locale,
  items,
}: {
  name: string
  description: string
  path: string
  locale: Locale
  /** เรียงตามลำดับที่แสดงจริงบนหน้า ไม่ใช่ลำดับใน query */
  items: { name: string; path?: string }[]
}) {
  const url = absoluteUrl(localizedPath(locale, path))

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#page`,
    url,
    name,
    description,
    inLanguage: locale === 'th' ? 'th-TH' : 'en-US',
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        ...(item.path ? { url: absoluteUrl(localizedPath(locale, item.path)) } : {}),
      })),
    },
  }
}

/** หน้าที่มีเนื้อหาเดียว ไม่ใช่รายการ — เกี่ยวกับเรา, ติดต่อ */
export function webPageSchema({
  type,
  name,
  description,
  path,
  locale,
}: {
  type: 'AboutPage' | 'ContactPage' | 'WebPage'
  name: string
  description: string
  path: string
  locale: Locale
}) {
  const url = absoluteUrl(localizedPath(locale, path))

  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#page`,
    url,
    name,
    description,
    inLanguage: locale === 'th' ? 'th-TH' : 'en-US',
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#organization` },
  }
}

// ──────────────────── อุปกรณ์ให้เช่า ────────────────────

/**
 * อุปกรณ์หนึ่งชิ้นเป็น Product พร้อมราคาเช่า
 *
 * เป็นชนิดข้อมูลที่ได้ผลค้นหาแบบมีราคาจริง ต่างจากรีวิวของตัวเอง
 * ที่ Google ประกาศชัดว่าไม่แสดงดาวให้ (ดู reviewSchema ข้างล่าง)
 *
 * คนค้นหาว่า "เช่ากล้อง <รุ่น> ราคา" คือคนที่ตั้งใจจะเช่าจริง
 * การมีราคาต่อวันติดอยู่ในผลค้นหาจึงมีค่ากว่าการอยู่อันดับสูงแต่ไม่มีใครกด
 */
export function equipmentProductSchema({
  name,
  description,
  brand,
  model,
  image,
  dailyRate,
  isAvailable,
  locale,
  path,
}: {
  name: string
  description: string | null
  brand: string
  model: string
  image: string | null
  dailyRate: number | null
  isAvailable: boolean
  locale: Locale
  /**
   * เส้นทางของหน้าที่ "ขาย" ชิ้นนี้ — ไม่ใส่ = หน้ารวมอุปกรณ์
   *
   * ตอนอยู่ในรายการรวมยังไม่มีหน้าของตัวเอง จึงชี้กลับไปที่ /rental
   * แต่พอเรนเดอร์บนหน้าของชิ้นนั้นเอง ต้องชี้มาที่หน้านั้น ไม่งั้นเท่ากับบอก Google ว่า
   * ราคานี้ไปดูได้ที่หน้ารวม ซึ่งไม่ตรงกับหน้าที่ประกาศราคาอยู่
   */
  path?: string
}) {
  // schema.org รับเฉพาะ URL เต็ม ค่าที่เป็นแค่ path จะถูกตีว่าเป็นข้อมูลผิดรูป
  const url = absoluteUrl(localizedPath(locale, path ?? '/rental'))

  return {
    '@type': 'Product',
    name,
    url,
    ...(description ? { description } : {}),
    // ยี่ห้อที่กรอกมาเป็นขีดกลางไม่ใช่ยี่ห้อ — ส่งออกไปแล้ว Google จะเก็บ "-" เป็นชื่อแบรนด์
    ...(equipmentBrand(brand) ? { brand: { '@type': 'Brand', name: equipmentBrand(brand) } } : {}),
    model,
    ...(image ? { image: [image] } : {}),
    ...(dailyRate
      ? {
          offers: {
            '@type': 'Offer',
            price: dailyRate,
            priceCurrency: 'THB',
            // ราคาต่อวัน ไม่ใช่ราคาขายขาด — ต้องบอกหน่วยเวลา ไม่งั้นตัวเลขจะถูกอ่านผิด
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: dailyRate,
              priceCurrency: 'THB',
              unitCode: 'DAY',
              referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'DAY' },
            },
            availability: isAvailable
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            businessFunction: 'https://schema.org/LeaseOut',
            seller: { '@id': `${siteUrl}/#organization` },
            url,
          },
        }
      : {}),
  }
}

// ──────────────────── รีวิว ────────────────────

/**
 * รีวิวรายชิ้น
 *
 * **Google จะไม่แสดงดาวจากรีวิวชุดนี้** เพราะเป็นรีวิวที่ธุรกิจเก็บไว้ในเว็บตัวเอง
 * ซึ่งถูกจัดเป็น self-serving review และถูกตัดสิทธิ์ rich result มาตั้งแต่ปี 2019
 * ใครที่บอกว่าใส่แล้วได้ดาวคือเข้าใจผิด
 *
 * ที่ยังใส่เพราะเครื่องมือค้นหาแบบ AI อ่าน JSON-LD ตรง ๆ เพื่อสรุปคำตอบ
 * เวลามีคนถามว่า "เจ้าไหนดี" ข้อความรีวิวจริงพร้อมชื่อผู้รีวิวคือสิ่งที่มันหยิบไปใช้ได้
 * ต่างจากตัวเลขเฉลี่ยลอย ๆ ที่ไม่มีอะไรรองรับ
 */
export function reviewSchema(review: {
  authorName: string
  authorRole: string | null
  content: string
  rating: number
  createdAt: Date
}) {
  return {
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: review.authorName,
      ...(review.authorRole ? { jobTitle: review.authorRole } : {}),
    },
    reviewBody: review.content,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    datePublished: review.createdAt.toISOString().slice(0, 10),
    itemReviewed: { '@id': `${siteUrl}/#organization` },
  }
}

// ──────────────────── ทีมงาน ────────────────────

/** สมาชิกทีมหนึ่งคน ใช้เป็น employee ของกิจการในหน้าเกี่ยวกับเรา */
export function personSchema({
  name,
  role,
  bio,
  photo,
}: {
  name: string
  role: string
  bio: string | null
  photo: string | null
}) {
  return {
    '@type': 'Person',
    name,
    jobTitle: role,
    ...(bio ? { description: bio } : {}),
    ...(photo ? { image: photo } : {}),
    worksFor: { '@id': `${siteUrl}/#organization` },
  }
}

// ──────────────────── วิดีโอ ────────────────────

/**
 * วิดีโอที่ฝังในหน้าผลงาน
 *
 * VideoObject เป็นหนึ่งในไม่กี่ชนิดที่ยังได้ผลค้นหาแบบมีรูปตัวอย่างจริง
 * และหน้าผลงานวิดีโอของเราคือหน้าที่ควรได้ประโยชน์จากมันที่สุด
 *
 * ต้องมี thumbnailUrl กับ uploadDate ไม่งั้น Google จะข้ามทั้งก้อน
 * ผลงานที่ไม่มีรูปปกและไม่ใช่ YouTube จึงคืน null แทนที่จะส่งข้อมูลไม่ครบออกไป
 */
export function videoObjectSchema({
  name,
  description,
  thumbnail,
  embedUrl,
  uploadDate,
}: {
  name: string
  description: string
  thumbnail: string | null
  embedUrl: string
  uploadDate: Date | null
}) {
  if (!thumbnail || !uploadDate) return null

  return {
    '@type': 'VideoObject',
    name,
    description,
    thumbnailUrl: [thumbnail],
    uploadDate: uploadDate.toISOString(),
    embedUrl,
    publisher: {
      '@id': `${siteUrl}/#organization`,
      logo: { '@type': 'ImageObject', url: logoUrl },
    },
  }
}
