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
  return { title: t('privacy'), robots: { index: true, follow: true } }
}

/**
 * เนื้อหาเขียนจากสิ่งที่ระบบเก็บจริง ไม่ใช่ข้อความสำเร็จรูป
 *
 * ทุกข้อตรงกับโค้ดที่มีอยู่: ฟอร์มติดต่อเก็บอะไร รีวิวเก็บอะไร
 * ไฟล์อยู่ที่ไหน และ IP ถูกเก็บเป็น hash ไม่ใช่ค่าดิบ
 *
 * ก่อนเปิดใช้จริงควรให้ผู้รู้ด้านกฎหมายตรวจอีกครั้ง
 * โดยเฉพาะถ้าภายหลังมีการเพิ่มการเก็บข้อมูลนอกเหนือจากนี้
 */
function content(locale: Locale, company: { email: string; nameTh: string; nameEn: string }) {
  if (locale === 'th') {
    return `${company.nameTh} เก็บข้อมูลส่วนบุคคลเท่าที่จำเป็นต่อการติดต่อกลับและให้บริการเท่านั้น หน้านี้อธิบายว่าเราเก็บอะไร เก็บทำไม และคุณขอให้ลบได้อย่างไร

## ข้อมูลที่เราเก็บ

**เมื่อคุณส่งฟอร์มติดต่อหรือขอใบเสนอราคา** เราเก็บชื่อ อีเมล เบอร์โทร ชื่อบริษัท งบประมาณที่ระบุ และข้อความที่คุณพิมพ์ ทั้งหมดนี้ใช้เพื่อติดต่อกลับและจัดทำข้อเสนอ

**เมื่อคุณเขียนรีวิว** เราเก็บชื่อที่คุณกรอก ตำแหน่งหรือบริษัท คะแนน และเนื้อหารีวิว อีเมลที่กรอกจะไม่แสดงบนหน้าเว็บ ใช้เพื่อยืนยันตัวตนและติดต่อกลับเท่านั้น

**ข้อมูลทางเทคนิค** เราเก็บค่าที่แปลงจากหมายเลข IP ด้วยวิธีที่ย้อนกลับไม่ได้ เพื่อจำกัดจำนวนครั้งที่ส่งฟอร์มและกันสแปม เราไม่เก็บหมายเลข IP ในรูปแบบเดิม

## เราไม่ทำอะไร

เราไม่ขายหรือแลกเปลี่ยนข้อมูลของคุณกับบุคคลที่สาม และไม่ส่งอีเมลโฆษณาหากคุณไม่ได้ขอ

## ผู้ให้บริการที่เกี่ยวข้อง

เว็บไซต์และฐานข้อมูลทำงานอยู่บน Railway ไฟล์ภาพเก็บบน Cloudflare R2 และอีเมลแจ้งเตือนส่งผ่าน Resend ผู้ให้บริการเหล่านี้ประมวลผลข้อมูลในฐานะผู้ประมวลผลข้อมูลแทนเราเท่านั้น

หากมีการเปิดใช้ Google Analytics จะมีการเก็บสถิติการเข้าชมแบบไม่ระบุตัวตน โดยตั้งค่าให้ตัดส่วนท้ายของหมายเลข IP ทิ้ง

## สิทธิของคุณ

คุณขอดู ขอแก้ไข หรือขอให้ลบข้อมูลของคุณได้ทุกเมื่อ เพียงส่งอีเมลมาที่ ${company.email} เราจะดำเนินการภายใน 30 วัน

## การเก็บรักษา

ข้อมูลคำขอจะถูกเก็บไว้ไม่เกิน 2 ปีนับจากการติดต่อครั้งล่าสุด เว้นแต่มีเหตุผลทางบัญชีหรือกฎหมายที่ต้องเก็บนานกว่านั้น`
  }

  return `${company.nameEn} collects personal data only where it is needed to reply to you and deliver our work. This page explains what we collect, why, and how to have it removed.

## What we collect

**When you submit a contact or quote request** we store your name, email, phone number, company, any budget range you select, and the message you write. We use these to reply and prepare a proposal.

**When you write a review** we store the name you enter, your role or company, the rating, and the review text. An email address, if given, is never shown publicly and is used only to verify the review and reply to you.

**Technical data.** We store a one-way transformation of your IP address to rate-limit form submissions and block spam. We do not keep the address itself.

## What we do not do

We do not sell or trade your data, and we do not send marketing email unless you ask for it.

## Processors we use

The site and database run on Railway, images are stored on Cloudflare R2, and notification email is sent through Resend. These providers process data on our behalf only.

Where Google Analytics is enabled, it collects anonymous traffic statistics with IP anonymisation turned on.

## Your rights

You may request a copy of your data, ask us to correct it, or ask us to delete it at any time. Email ${company.email} and we will act within 30 days.

## Retention

Enquiry records are kept for no longer than two years after our last contact, unless accounting or legal obligations require otherwise.`
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, settings] = await Promise.all([getTranslations('footer'), getSiteSettings()])
  const updated = new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'long',
  }).format(new Date('2026-08-10'))

  return (
    <article className="py-16 md:py-24">
      <div className="container">
        <header className="max-w-3xl">
          <h1 className="font-display text-display-md text-balance">{t('privacy')}</h1>
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
