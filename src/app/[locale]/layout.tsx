import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Thai, Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale, getMessages } from 'next-intl/server'
import { pickMessages, PUBLIC_CLIENT_NAMESPACES } from '@/i18n/client-messages'
import { notFound } from 'next/navigation'
import { Analytics } from '@/components/Analytics'
import { JsonLd } from '@/components/JsonLd'
import { Providers } from '@/components/Providers'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ServiceCategory } from '@/generated/prisma/enums'
import { routing, type Locale } from '@/i18n/routing'
import { clientEnv } from '@/lib/env'
import { getNonce } from '@/lib/nonce'
import { ogImageUrl } from '@/lib/og'
import { pageMetadata } from '@/lib/seo'
import { getSiteSettings } from '@/lib/settings'
import { organizationSchema, websiteSchema } from '@/lib/structured-data'
import '../globals.css'
import '../editorial.css'

/**
 * ฟอนต์แยกตามภาษา ไม่ใช่ปล่อยให้ fallback หากลิฟเอง
 *
 * การวาง stack เป็น "ละตินก่อน แล้วค่อยตกไปไทย" ดูเหมือนจะได้ผล
 * แต่ตัวเลขและเครื่องหมายวรรคตอนมีอยู่ในฟอนต์ละตินด้วย มันจึงไม่เคยตกไปฟอนต์ไทย
 * ทำให้ "15,000 บาท" มีตัวเลขคนละฟอนต์กับตัวอักษร — คนละ x-height คนละน้ำหนัก
 *
 * ทางแก้คือสลับลำดับ stack ตาม :lang() ใน globals.css
 * หน้าไทยจึงใช้ฟอนต์ไทยล้วนทั้งตัวอักษร ตัวเลข และวรรคตอน
 */

// ละติน — หัวข้อเป็น serif ให้ความรู้สึกงาน editorial เนื้อหาเป็น sans อ่านง่าย
// ไม่ประกาศ italic เพราะทั้งเว็บไม่มีที่ไหนใช้ — ประกาศไว้เฉย ๆ คือดึงไฟล์ทิ้งฟรีทุกหน้า
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

/**
 * ไทย — ตระกูลเดียวใช้ทั้งหัวข้อและเนื้อหา กลิฟละตินของมันคือ IBM Plex Sans
 * ภาษาอังกฤษที่แทรกในประโยคไทยจึงกลมกลืน ไม่กระโดดเป็นอีกฟอนต์
 *
 * ต้องมี subset latin ด้วย ไม่ใช่แค่ thai เพราะตัวเลข 0-9 อยู่ในช่วง latin
 * ถ้าตัดออกตัวเลขจะตกไปฟอนต์อื่นแล้วกลับไปเป็นปัญหาเดิม
 *
 * เคยลองแยกประกาศเป็นสองชุดเพื่อ preload เฉพาะน้ำหนักหัวข้อ แต่ไม่ได้ผล
 * next/font รวมประกาศที่เป็นตระกูลและ subset เดียวกันเข้าด้วยกัน แล้วให้ preload ชนะ
 */
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
})

// ใช้เฉพาะป้ายเล็ก ๆ ไม่กี่จุด ไม่คุ้มที่จะดึงล่วงหน้า
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
})

const fontVariables = [
  instrumentSerif.variable,
  inter.variable,
  plexThai.variable,
  jetbrainsMono.variable,
].join(' ')

/** เรียงตามลำดับที่อยากให้อ่าน ไม่ใช่ลำดับใน enum — งานดิจิทัลก่อน งานภาพทีหลัง */
const serviceCategories = [
  ServiceCategory.WEB,
  ServiceCategory.WEB_APP,
  ServiceCategory.MOBILE_APP,
  ServiceCategory.PHOTOGRAPHY,
  ServiceCategory.VIDEO,
  ServiceCategory.STUDIO,
] as const

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/**
 * สีของแถบเบราว์เซอร์บนมือถือ ตามธีมที่ผู้ใช้ตั้งไว้
 *
 * ค่าตรงกับ --background ของแต่ละธีมใน globals.css
 * ถ้าไม่ประกาศ Chrome บน Android จะวาดแถบสีขาวคาดอยู่เหนือหน้าเว็บโหมดมืดตลอด
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(40 23% 98%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(240 8% 5%)' },
  ],
  colorScheme: 'light dark',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })
  const tBrand = await getTranslations({ locale, namespace: 'brand' })

  const base = pageMetadata({
    locale,
    path: '',
    title: t('metaTitle'),
    description: t('metaDescription'),
    image: ogImageUrl(t('metaTitle'), tBrand('tagline')),
  })

  return {
    ...base,
    metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
    title: {
      default: t('metaTitle'),
      template: `%s · ${tBrand('name')}`,
    },
    applicationName: tBrand('name'),
    openGraph: { ...base.openGraph, siteName: tBrand('name') },
    /*
     * ไม่ประกาศ icons เอง — ปล่อยให้ Next ผูกจากไฟล์ใน src/app
     * (favicon.ico, icon.png, apple-icon.png) ถ้าประกาศทับ ลิงก์ที่ Next สร้างจะหายไปบางตัว
     * ส่วนรูปแบรนด์ที่ Google ดึงไปใช้ประกาศไว้ใน JSON-LD แล้ว
     */
    manifest: '/manifest.webmanifest',
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    formatDetection: { telephone: false },
    ...(clientEnv.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { verification: { google: clientEnv.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
      : {}),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const [t, tCategory, settings, nonce] = await Promise.all([
    getTranslations({ locale, namespace: 'common' }),
    getTranslations({ locale, namespace: 'serviceCategory' }),
    getSiteSettings(),
    getNonce(),
  ])

  // ชื่อบริการภาษาเดียวกับที่คนเห็นบนเมนู ไม่ใช่รายการที่ฮาร์ดโค้ดแยกไว้ใน JSON-LD
  const serviceNames = serviceCategories.map((category) => tCategory(category))

  // ส่งให้เบราว์เซอร์เฉพาะข้อความที่ client component ใช้ ข้อความที่เหลือเรนเดอร์ไปแล้วฝั่ง server
  const clientMessages = pickMessages(await getMessages(), PUBLIC_CLIENT_NAMESPACES)

  return (
    <html lang={locale} suppressHydrationWarning className={fontVariables}>
      <body className="public-site flex min-h-dvh flex-col">
        {/* แถบบอกความคืบหน้าการอ่าน ผูกกับ scroll timeline ของ CSS ไม่มี JavaScript */}
        <div aria-hidden className="scroll-progress no-print" />

        <NextIntlClientProvider messages={clientMessages}>
          <Providers nonce={nonce}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
            >
              {t('skipToContent')}
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </Providers>
        </NextIntlClientProvider>

        {/* ประกาศตัวตนธุรกิจให้ Google ครั้งเดียวที่ layout ทุกหน้าได้รับผลเหมือนกัน */}
        <JsonLd data={organizationSchema(settings, locale, serviceNames)} />
        <JsonLd data={websiteSchema(settings, locale)} />

        <Analytics nonce={nonce} />
      </body>
    </html>
  )
}
