import type { Metadata } from 'next'
import { locales, localizedPath, type Locale } from '@/i18n/routing'
import { ogImageUrl } from './og'

/**
 * เมทาดาทาของทุกหน้า ประกอบจากที่เดียว
 *
 * เดิมแต่ละหน้าเขียน title/description/canonical เองแล้วจบ ผลคือมีแค่หน้าแรกที่บอก Google
 * ว่าหน้าไทยกับหน้าอังกฤษเป็นเนื้อหาเดียวกัน (hreflang) — อีกสิบกว่าหน้าที่เหลือไม่ได้บอกเลย
 * Google จึงมีสิทธิ์มองว่าเป็นเนื้อหาซ้ำและเลือกแสดงผิดภาษาให้ผู้ค้นหา
 *
 * รวมมาไว้ที่นี่แล้วทุกหน้าได้ครบเท่ากัน: canonical, hreflang ทุกภาษา, x-default,
 * รูปพรีวิวตอนแชร์, และการ์ดของ X/Twitter
 */

type PageMetaInput = {
  locale: Locale
  /** เส้นทางหลัง prefix ภาษา เช่น '/work/my-project' — หน้าแรกใส่ '' */
  path: string
  title: string
  description: string
  /** รูปพรีวิวจริงของหน้านั้น ถ้าไม่มีจะสร้างการ์ดตัวหนังสือให้อัตโนมัติ */
  image?: string | null
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  /** หน้าที่ไม่ควรถูกเก็บ index เช่น หน้าผลการค้นหาหรือหน้าชั่วคราว */
  noIndex?: boolean
}

export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  noIndex,
}: PageMetaInput): Metadata {
  const languages = Object.fromEntries(locales.map((code) => [code, localizedPath(code, path)]))

  const preview = image ?? ogImageUrl(title)

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: {
        ...languages,
        /**
         * x-default บอกว่าจะส่งใครก็ตามที่ภาษาไม่ตรงกับที่เรามีไปหน้าไหน
         * เลือกไทยเพราะลูกค้าหลักอยู่ในไทย ไม่ใช่เพราะมันเป็นภาษาเริ่มต้นของโค้ด
         */
        'x-default': localizedPath('th', path),
      },
    },
    openGraph: {
      type,
      url: localizedPath(locale, path),
      title,
      description,
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      alternateLocale: locale === 'th' ? 'en_US' : 'th_TH',
      images: [{ url: preview, width: 1200, height: 630, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [preview],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  }
}
