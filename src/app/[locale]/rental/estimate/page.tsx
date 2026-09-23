import { AlertTriangle, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { buttonClasses } from '@/components/ui/Button'
import { PrintButton } from '@/components/ui/PrintButton'
import { bahtText } from '@/lib/baht-text'
import { formatPrice, toNumber } from '@/lib/format'
import { rentalEstimateTotals, rentalLineTotal } from '@/lib/rental-pricing'
import { rentalQuoteTerms } from '@/lib/rental-quote'
import { pageMetadata } from '@/lib/seo'
import { getQuoteDefaults, getSiteSettings } from '@/lib/settings'
import { getEquipmentByIds } from '@/server/queries'

/**
 * ใบเสนอราคาเบื้องต้นที่ลูกค้ากดออกเอง
 *
 * ทำเฉพาะค่าเช่าอุปกรณ์ก่อน เพราะเป็นหมวดเดียวที่ราคานิ่งจริง —
 * เรตต่อวันต่อสัปดาห์ตายตัวอยู่ในฐานข้อมูล ไม่ต้องประเมินขอบเขตงานก่อนถึงจะบอกราคาได้
 * งานถ่ายภาพหรือทำเว็บยังต้องคุยขอบเขตก่อนเสมอ จึงยังไม่เอามารวมในนี้
 *
 * สิ่งที่เลือกส่งมาทาง URL เป็น id ล้วน ราคาทั้งหมดอ่านจากฐานข้อมูลในหน้านี้
 * ลูกค้าจึงแก้ตัวเลขจากแถบที่อยู่ไม่ได้ และเอกสารที่พิมพ์ออกไปตรงกับเรตจริงในระบบวันนั้น
 *
 * ตั้งใจไม่ทำเป็นไฟล์ PDF จากฝั่งเซิร์ฟเวอร์ — ใช้กล่องพิมพ์ของเบราว์เซอร์แทน
 * ได้การตัดคำและวางสระภาษาไทยที่ถูกต้องฟรี และไม่ต้องฝังฟอนต์เข้า bundle
 */
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ locale: Locale }>; searchParams: Promise<SearchParams> }
type SearchParams = { items?: string; days?: string }

/** จำกัดเพดานไว้กันคนแก้ URL แล้วได้เอกสารที่ตัวเลขหลุดโลก */
const MAX_DAYS = 365
const MAX_ITEMS = 30

function parseIds(raw: string | undefined): string[] {
  if (!raw) return []
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))].slice(0, MAX_ITEMS)
}

function parseDays(raw: string | undefined): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(MAX_DAYS, Math.max(1, Math.trunc(parsed)))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'estimate' })

  return {
    ...pageMetadata({
      locale,
      path: '/rental/estimate',
      title: t('metaTitle'),
      description: t('subtitle'),
      // เอกสารที่สร้างจากสิ่งที่ลูกค้าเลือก ไม่ใช่เนื้อหาของเว็บ ไม่ควรอยู่ในผลค้นหา
      noIndex: true,
    }),
    robots: { index: false, follow: false },
  }
}

export default async function RentalEstimatePage({ params, searchParams }: Params) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  setRequestLocale(locale)

  const ids = parseIds(query.items)
  const days = parseDays(query.days)

  const [t, equipment, settings, quoteDefaults] = await Promise.all([
    getTranslations('estimate'),
    getEquipmentByIds(ids),
    getSiteSettings(),
    getQuoteDefaults(),
  ])

  const isThai = locale === 'th'
  const { company } = settings

  if (equipment.length === 0) {
    return (
      <section className="py-20 md:py-28">
        <div className="container max-w-xl text-center">
          <h1 className="font-display text-display-md text-balance">{t('empty')}</h1>
          <p className="mt-4 text-muted-foreground text-pretty">{t('emptyHint')}</p>
          <Link href="/rental" className={buttonClasses('primary', 'lg', 'mt-8')}>
            {t('backToRental')}
          </Link>
        </div>
      </section>
    )
  }

  const lines = equipment.map((item) => {
    const dailyRate = toNumber(item.dailyRate)
    const weeklyRate = toNumber(item.weeklyRate)
    const line = rentalLineTotal({ dailyRate, weeklyRate, quantity: 1 }, days)

    return {
      id: item.id,
      name: `${item.brand} ${item.model}`,
      subtitle: isThai ? item.nameTh : item.nameEn,
      dailyLabel: formatPrice(dailyRate, locale),
      weeklyLabel: formatPrice(weeklyRate, locale),
      deposit: toNumber(item.depositAmount) ?? 0,
      ...line,
    }
  })

  const totals = rentalEstimateTotals({
    amounts: lines.map((line) => line.amount),
    deposits: lines.map((line) => line.deposit),
    vatRate: quoteDefaults.defaultVatRate,
    hasOnRequest: lines.some((line) => line.isOnRequest),
  })

  const issueDate = new Date()
  const validUntil = new Date(issueDate)
  validUntil.setDate(validUntil.getDate() + quoteDefaults.defaultValidDays)

  const dateFormat = new Intl.DateTimeFormat(isThai ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
  const money = new Intl.NumberFormat(isThai ? 'th-TH' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  /**
   * เงื่อนไขของการเช่า ชุดเดียวกับที่ใบเสนอราคาค่าเช่าตัวจริงตั้งต้นให้
   * ไม่ใช่ termsTh/termsEn ในหน้าตั้งค่า ซึ่งเป็นเงื่อนไขงานบริการ (มัดจำ 50% ก่อนเริ่มงาน
   * ชำระส่วนที่เหลือเมื่อส่งมอบงาน ค่าเดินทาง) — ผู้เช่าอ่านแล้วไม่รู้ว่าต้องจ่ายค่าเช่าหรือเงินประกันอย่างไร
   */
  const terms = rentalQuoteTerms(locale, quoteDefaults.defaultValidDays)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  // ปุ่มเปลี่ยนจำนวนวันเป็นลิงก์ธรรมดา เอกสารจึงเปลี่ยนได้โดยไม่ต้องรอ JavaScript
  const dayOptions = [1, 2, 3, 5, 7, 14, 30]
  const itemsParam = equipment.map((item) => item.id).join(',')

  return (
    <div className="bg-muted/40 py-8 print:bg-white print:py-0">
      {/* แถบควบคุม — ไม่ติดไปกับกระดาษตอนพิมพ์ */}
      <div className="container mb-6 max-w-[210mm] no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={{ pathname: '/rental' }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
            {t('backToRental')}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {/* ส่งอุปกรณ์กับจำนวนวันต่อไปที่ฟอร์ม เดิมลิงก์ไป /contact เปล่า ๆ ลูกค้าต้องเลือกใหม่หรือพิมพ์บอกเอง */}
            <Link
              href={{ pathname: '/contact', query: { items: itemsParam, days }, hash: 'lead-form' }}
              className={buttonClasses('outline', 'md')}
            >
              {t('requestFormal')}
            </Link>
            <PrintButton label={t('print')} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-4">
          <span className="mr-1 text-sm font-medium">{t('rentalDays')}</span>
          {dayOptions.map((option) => (
            <Link
              key={option}
              href={{ pathname: '/rental/estimate', query: { items: itemsParam, days: option } }}
              aria-current={option === days ? 'true' : undefined}
              className={
                option === days
                  ? 'rounded-md border border-foreground bg-foreground px-3 py-1.5 text-sm text-background'
                  : 'rounded-md border border-input px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground'
              }
            >
              {option}
            </Link>
          ))}
          {/* ค่าที่ไม่มีในปุ่มลัด เช่น 4 หรือ 10 วัน ยังกรอกเองได้ */}
          <form action={localizedPath(locale, `/rental/estimate`)} className="ml-auto flex items-center gap-2">
            <input type="hidden" name="items" value={itemsParam} />
            <label htmlFor="days" className="sr-only">
              {t('rentalDays')}
            </label>
            {/*
              key ตามจำนวนวันในเอกสาร — กดปุ่มลัดแล้วช่องนี้ต้องเปลี่ยนตาม
              defaultValue ใช้แค่ตอนสร้างช่อง ถ้าลูกค้าพิมพ์ 4 แล้วกดปุ่ม 7 ช่องจะค้าง 4
              แล้วกด "คำนวณใหม่" ก็พาเอกสารย้อนกลับไปเป็น 4 วัน สร้างช่องใหม่ทุกครั้งที่ค่าเปลี่ยนจึงตรงกันเสมอ
            */}
            <input
              key={days}
              id="days"
              name="days"
              type="number"
              min={1}
              max={MAX_DAYS}
              defaultValue={days}
              className="h-9 w-20 rounded-md border border-input bg-surface px-3 text-sm"
            />
            <button
              type="submit"
              className="h-9 rounded-md border border-input px-3 text-sm transition-colors hover:border-foreground/25 hover:bg-muted"
            >
              {t('updateDays')}
            </button>
          </form>
        </div>
      </div>

      {/*
        กระดาษ A4 — หน่วยเป็นมิลลิเมตรและพอยต์ ให้พิมพ์ออกมาตรงกับที่เห็นบนจอ

        จอแคบกว่ากระดาษ (มือถือ) ลดขอบกระดาษ เรียงหัวเอกสารลงเป็นแถว และย้ายเรตเข้าไปใต้ชื่อรายการ
        เดิมใช้ขอบ 15mm กับหัวเอกสารสองฝั่งที่ห้ามหดตลอด บนจอ 390px ชื่อเอกสารกับวันที่จึงล้นขอบขวา
        ตอนพิมพ์กระดาษกว้างพอสำหรับ sm: อยู่แล้ว และกำกับ print: ไว้ซ้ำให้แน่ใจว่าได้รูปแบบ A4 เสมอ
      */}
      <article className="mx-auto w-[210mm] max-w-full bg-white p-5 text-[10pt] leading-relaxed text-black shadow-lift sm:p-[15mm] print:w-auto print:p-0 print:shadow-none">
        <header className="flex flex-col gap-5 border-b-2 border-black pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 print:flex-row print:items-start print:justify-between print:gap-8">
          <div className="flex gap-4">
            <Image
              src="/logo.png"
              alt=""
              width={512}
              height={512}
              className="h-14 w-14 shrink-0 [print-color-adjust:exact] sm:h-[20mm] sm:w-[20mm] print:h-[20mm] print:w-[20mm]"
              unoptimized
            />
            <div className="min-w-0">
              <p className="text-[15pt] font-bold leading-tight">
                {(isThai ? company.legalNameTh || company.nameTh : company.nameEn) ||
                  'Alexan Production'}
              </p>
              <p className="mt-1.5 max-w-[80mm] text-[8.5pt] leading-snug text-neutral-600">
                {isThai ? company.addressTh : company.addressEn}
              </p>
              <p className="mt-1 text-[8.5pt] text-neutral-600">
                {[company.phone, company.email].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="sm:shrink-0 sm:text-right print:shrink-0 print:text-right">
            {/* หัวเรื่องหลักของหน้า — หน้านี้ไม่มี h1 อื่น */}
            <h1 className="text-[15pt] font-bold leading-tight tracking-wide">{t('documentTitle')}</h1>
            <table className="mt-2 text-[9pt] sm:ml-auto print:ml-auto">
              <tbody>
                <tr>
                  <td className="pr-3 text-neutral-600">{t('issueDate')}</td>
                  <td>{dateFormat.format(issueDate)}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-neutral-600">{t('validUntil')}</td>
                  <td>{dateFormat.format(validUntil)}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-neutral-600">{t('rentalDays')}</td>
                  <td className="font-semibold">{t('days', { count: days })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </header>

        {/*
          คำเตือนอยู่บนสุดก่อนตัวเลข ไม่ใช่ตัวเล็ก ๆ ท้ายกระดาษ
          เพราะคนที่รับเอกสารต่อไปอาจไม่ใช่คนที่กดสร้างเอง และต้องรู้ตั้งแต่บรรทัดแรก
          ว่านี่ยังไม่ใช่เอกสารที่เอาไปเบิกจ่ายได้
        */}
        <section className="mt-5 flex gap-2.5 border border-neutral-400 bg-neutral-50 p-3 print:bg-neutral-50">
          <AlertTriangle size={14} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0" />
          <div>
            <p className="text-[9pt] font-semibold">{t('disclaimerTitle')}</p>
            <p className="mt-0.5 text-[8.5pt] leading-snug text-neutral-700">{t('disclaimer')}</p>
          </div>
        </section>

        <table className="mt-6 w-full border-collapse text-[9.5pt]">
          <thead>
            <tr className="border-y border-black bg-neutral-100 print:bg-neutral-100">
              <th className="w-8 py-2 pl-2 text-left font-semibold sm:w-[10mm] print:w-[10mm]">#</th>
              <th className="py-2 text-left font-semibold">{t('item')}</th>
              <th className="hidden w-[38mm] py-2 text-right font-semibold sm:table-cell print:table-cell">
                {t('rate')}
              </th>
              <th className="py-2 pr-2 text-right font-semibold sm:w-[32mm] print:w-[32mm]">{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const rate = line.dailyLabel ? (
                <>
                  <span className="block">
                    {line.dailyLabel} {t('perDay')}
                  </span>
                  {line.weeks > 0 && line.weeklyLabel && (
                    <span className="block">
                      {line.weeklyLabel} {t('perWeek')}
                    </span>
                  )}
                </>
              ) : (
                t('onRequest')
              )

              return (
                <tr key={line.id} className="border-b border-neutral-300 align-top">
                  <td className="py-2.5 pl-2 tabular-nums">{index + 1}</td>
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{line.name}</span>
                    {line.subtitle && line.subtitle !== line.name && (
                      <span className="block text-[8.5pt] text-neutral-600">{line.subtitle}</span>
                    )}
                    {/* จอแคบไม่มีที่ให้คอลัมน์เรต ย้ายมาไว้ใต้ชื่อแทน ข้อมูลยังครบ */}
                    <span className="mt-1 block text-[8.5pt] tabular-nums text-neutral-600 sm:hidden print:hidden">
                      {rate}
                    </span>
                  </td>
                  <td className="hidden py-2.5 text-right text-[8.5pt] tabular-nums text-neutral-600 sm:table-cell print:table-cell">
                    {rate}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-2 text-right tabular-nums">
                    {line.isOnRequest ? t('onRequest') : money.format(line.amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {totals.hasOnRequest && (
          <p className="mt-3 text-[8.5pt] text-neutral-700">{t('onRequestNote')}</p>
        )}

        <div className="mt-5 flex justify-end">
          <table className="w-full text-[9.5pt] sm:w-[85mm] print:w-[85mm]">
            <tbody className="tabular-nums">
              <tr>
                <td className="py-1 text-neutral-600">{t('subtotal')}</td>
                <td className="py-1 text-right">{money.format(totals.subtotal)}</td>
              </tr>
              <tr>
                <td className="py-1 text-neutral-600">
                  {t('vat')} {quoteDefaults.defaultVatRate}%
                </td>
                <td className="py-1 text-right">{money.format(totals.vatAmount)}</td>
              </tr>
              <tr className="border-t-2 border-black text-[11pt] font-bold">
                <td className="pt-2">{t('total')}</td>
                <td className="pt-2 text-right">{money.format(totals.total)}</td>
              </tr>
              {totals.deposit > 0 && (
                <tr className="border-t border-neutral-300">
                  <td className="pt-2 text-neutral-600">{t('deposit')}</td>
                  <td className="pt-2 text-right">{money.format(totals.deposit)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isThai && (
          <p className="mt-3 border-y border-neutral-300 bg-neutral-50 py-2 text-center text-[9.5pt] print:bg-neutral-50">
            ({bahtText(totals.total)})
          </p>
        )}

        {totals.deposit > 0 && (
          <p className="mt-3 text-[8.5pt] leading-snug text-neutral-700">{t('depositNote')}</p>
        )}

        {terms.length > 0 && (
          <section className="mt-6">
            <p className="text-[9pt] font-semibold">{t('terms')}</p>
            <ol className="ml-4 mt-1 list-decimal space-y-0.5 text-[8.5pt] text-neutral-700">
              {terms.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
          </section>
        )}

        <footer className="mt-8 border-t border-neutral-300 pt-4 text-[8.5pt] text-neutral-600">
          <p>
            {t('requestFormal')} · {[company.phone, company.email].filter(Boolean).join(' · ')}
          </p>
          {company.lineId && <p className="mt-0.5">LINE {company.lineId}</p>}
          <p className="mt-1">{t('subtitle')}</p>
        </footer>
      </article>
    </div>
  )
}
