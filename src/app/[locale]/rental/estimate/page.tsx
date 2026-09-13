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

  const terms = (isThai ? quoteDefaults.termsTh : quoteDefaults.termsEn)
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
            <Link href="/contact" className={buttonClasses('outline', 'md')}>
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
            <input
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

      {/* กระดาษ A4 — หน่วยเป็นมิลลิเมตรและพอยต์ ให้พิมพ์ออกมาตรงกับที่เห็นบนจอ */}
      <article className="mx-auto w-[210mm] max-w-full bg-white p-[15mm] text-[10pt] leading-relaxed text-black shadow-lift print:w-auto print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b-2 border-black pb-5">
          <div className="flex gap-4">
            <Image
              src="/logo.png"
              alt=""
              width={512}
              height={512}
              className="h-[20mm] w-[20mm] shrink-0 [print-color-adjust:exact]"
              unoptimized
            />
            <div>
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

          <div className="shrink-0 text-right">
            <p className="text-[15pt] font-bold tracking-wide">{t('documentTitle')}</p>
            <table className="ml-auto mt-2 text-[9pt]">
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
              <th className="w-[10mm] py-2 pl-2 text-left font-semibold">#</th>
              <th className="py-2 text-left font-semibold">{t('item')}</th>
              <th className="w-[38mm] py-2 text-right font-semibold">{t('rate')}</th>
              <th className="w-[32mm] py-2 pr-2 text-right font-semibold">{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} className="border-b border-neutral-300 align-top">
                <td className="py-2.5 pl-2 tabular-nums">{index + 1}</td>
                <td className="py-2.5 pr-4">
                  <span className="font-medium">{line.name}</span>
                  {line.subtitle && line.subtitle !== line.name && (
                    <span className="block text-[8.5pt] text-neutral-600">{line.subtitle}</span>
                  )}
                </td>
                <td className="py-2.5 text-right text-[8.5pt] tabular-nums text-neutral-600">
                  {line.dailyLabel ? (
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
                  )}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">
                  {line.isOnRequest ? t('onRequest') : money.format(line.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totals.hasOnRequest && (
          <p className="mt-3 text-[8.5pt] text-neutral-700">{t('onRequestNote')}</p>
        )}

        <div className="mt-5 flex justify-end">
          <table className="w-[85mm] text-[9.5pt]">
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
