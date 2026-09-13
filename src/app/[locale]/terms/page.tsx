import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { Prose } from '@/components/ui/Prose'
import { getSiteSettings } from '@/lib/settings'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'footer' })
  return { title: t('terms'), robots: { index: true, follow: true } }
}

/**
 * เงื่อนไขการใช้งานเว็บไซต์ ไม่ใช่สัญญาจ้างงาน
 * เงื่อนไขของงานจริงอยู่ในใบเสนอราคาแต่ละใบ ซึ่งมีผลเหนือหน้านี้
 *
 * ควรให้ผู้รู้ด้านกฎหมายตรวจก่อนใช้จริง
 */
function content(locale: Locale, company: { email: string; nameTh: string; nameEn: string }) {
  if (locale === 'th') {
    return `หน้านี้ครอบคลุมการใช้งานเว็บไซต์นี้เท่านั้น เงื่อนไขของงานที่ว่าจ้างจริงจะระบุอยู่ในใบเสนอราคาแต่ละฉบับ และใบเสนอราคามีผลเหนือข้อความในหน้านี้

## ข้อมูลบนเว็บไซต์

ราคาที่แสดงเป็นราคาเริ่มต้นเพื่อให้ประเมินงบประมาณคร่าว ๆ ราคาจริงขึ้นกับขอบเขตงานและจะสรุปเป็นใบเสนอราคาก่อนเริ่มงานเสมอ ราคาที่แสดงยังไม่รวมภาษีมูลค่าเพิ่ม

รายการอุปกรณ์ให้เช่าแสดงเพื่อให้ทราบว่ามีอะไรบ้าง การจองจะยืนยันได้ต่อเมื่อเราตรวจสอบวันว่างและตอบกลับแล้วเท่านั้น การกดส่งคำขอบนเว็บไซต์ยังไม่ถือเป็นการจอง

## ผลงานและลิขสิทธิ์

ผลงานที่แสดงเป็นงานที่ ${company.nameTh} ผลิตขึ้น บางชิ้นเผยแพร่โดยได้รับความยินยอมจากลูกค้าแล้ว ห้ามนำภาพ วิดีโอ หรือข้อความบนเว็บไซต์นี้ไปใช้ซ้ำเพื่อการค้าโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร

สำหรับงานที่ว่าจ้าง สิทธิ์การใช้งานจะระบุไว้ในใบเสนอราคาของงานนั้น

## รีวิวจากผู้ใช้

รีวิวทุกชิ้นผ่านการตรวจสอบก่อนเผยแพร่ เราขอสงวนสิทธิ์ไม่เผยแพร่หรือถอดรีวิวที่มีถ้อยคำหยาบคาย ข้อมูลเท็จ หรือไม่เกี่ยวข้องกับบริการของเรา แต่จะไม่ลบรีวิวเพียงเพราะเป็นคำติชมเชิงลบ

## ข้อจำกัดความรับผิด

เราพยายามให้ข้อมูลบนเว็บไซต์ถูกต้องและเป็นปัจจุบัน แต่ไม่รับประกันความสมบูรณ์ของข้อมูล และไม่รับผิดต่อความเสียหายที่เกิดจากการใช้ข้อมูลบนเว็บไซต์นี้โดยไม่ได้ตรวจสอบกับเราก่อน

## ติดต่อ

มีคำถามเกี่ยวกับเงื่อนไขเหล่านี้ ส่งอีเมลมาที่ ${company.email}`
  }

  return `This page covers use of this website only. The terms of any commissioned work are set out in the individual quotation for that work, and the quotation takes precedence over anything written here.

## Information on this site

Listed prices are starting points to help you judge budget. Final cost depends on scope and is always confirmed in a written quotation before work begins. Listed prices exclude VAT.

The rental catalogue shows what we hold. A booking is confirmed only once we have checked availability and replied. Submitting a request on the site is not a booking.

## Work and copyright

The work shown was produced by ${company.nameEn}, and pieces are published with client consent where required. Images, video, and text on this site may not be reused commercially without written permission.

For commissioned work, usage rights are set out in that project's quotation.

## User reviews

Every review is checked before it is published. We may decline to publish or later remove reviews containing abusive language, false statements, or content unrelated to our services. We do not remove a review simply for being critical.

## Limitation of liability

We work to keep the information here accurate and current, but we do not warrant that it is complete, and we are not liable for losses arising from reliance on it without confirming with us first.

## Contact

Questions about these terms: ${company.email}`
}

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, settings] = await Promise.all([getTranslations('footer'), getSiteSettings()])
  const updated = new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'long',
  }).format(new Date('2026-08-10'))

  return (
    <article className="py-16 md:py-24">
      <div className="container">
        <header className="max-w-3xl">
          <h1 className="font-display text-display-md text-balance">{t('terms')}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {locale === 'th' ? 'ปรับปรุงล่าสุด' : 'Last updated'} {updated}
          </p>
        </header>

        <div className="mt-10">
          <Prose>{content(locale, settings.company)}</Prose>
        </div>
      </div>
    </article>
  )
}
