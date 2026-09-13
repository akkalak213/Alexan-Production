import type { Metadata } from 'next'
import { IBM_Plex_Sans_Thai, Inter, Instrument_Serif } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ADMIN_CLIENT_NAMESPACES, pickMessages } from '@/i18n/client-messages'
import { Providers } from '@/components/Providers'
import { ToastProvider } from '@/components/ui/Toast'
import { getNonce } from '@/lib/nonce'
import '../globals.css'

/**
 * root layout ของหลังบ้าน แยกจาก [locale] เพราะ /admin ไม่มี prefix ภาษา
 * หลังบ้านใช้ภาษาไทยอย่างเดียว — เป็นเครื่องมือภายในของทีม ไม่ใช่หน้าที่ลูกค้าเห็น
 */

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'หลังบ้าน · Alexan Production', template: '%s · หลังบ้าน' },
  // หน้าหลังบ้านต้องไม่ถูกเก็บ index ไม่ว่ากรณีใด
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // หลังบ้านล็อกภาษาไทย แต่ยังต้องมี provider เพราะคอมโพเนนต์ที่ใช้ร่วมกับหน้าเว็บ
  // (เช่น ปุ่มสลับธีม) อ่านข้อความจาก next-intl
  const [messages, nonce] = await Promise.all([getMessages({ locale: 'th' }), getNonce()])

  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${inter.variable} ${plexThai.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider locale="th" messages={pickMessages(messages, ADMIN_CLIENT_NAMESPACES)}>
          <Providers nonce={nonce}>
            <ToastProvider>{children}</ToastProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
