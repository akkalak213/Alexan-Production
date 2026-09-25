import { MessageSquareQuote, PenLine } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { buttonClasses } from '@/components/ui/Button'
import { RatingStars } from '@/components/ui/RatingStars'
import { Section } from '@/components/ui/Section'
import { JsonLd } from '@/components/JsonLd'
import { formatNumber } from '@/lib/format'
import {
  aggregateRatingSchema,
  breadcrumbSchema,
  collectionPageSchema,
  reviewSchema,
} from '@/lib/structured-data'
import { getApprovedReviews, getReviewStats } from '@/server/queries'

/**
 * เรนเดอร์ตอนมีคนขอ ไม่ prerender ตอน build
 *
 * ตอน build บน Railway ยังต่อฐานข้อมูลไม่ได้ (private network เปิดหลัง deploy)
 * เดิมใช้ ISR โดยหวังว่าหน้าจะรีเฟรชตัวเองหลังขึ้นระบบ แต่ผลจริงคือ
 * หน้าที่ prerender ด้วยข้อมูลเปล่าถูกแคชไว้และเสิร์ฟไปอีกสิบนาทีเต็มหลัง deploy ทุกครั้ง
 * ส่วนที่ผูกกับข้อมูลจึงหายไปทั้งก้อนในช่วงนั้น
 *
 * ฐานข้อมูลอยู่บน private network แล้ว วัดได้ 165ms จากเดิม 859ms
 * การอ่านสดทุกครั้งจึงถูกกว่าการเสี่ยงเสิร์ฟหน้าเปล่า
 */
export const dynamic = 'force-dynamic'


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'reviews' })

  return pageMetadata({
    locale,
    path: '/reviews',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function ReviewsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, tNav, reviews, stats] = await Promise.all([
    getTranslations('reviews'),
    getTranslations('nav'),
    getApprovedReviews(),
    getReviewStats(),
  ])

  return (
    <>
      {/*
        Google จะไม่แสดงดาวจากรีวิวชุดนี้ในผลค้นหา
        รีวิวที่ธุรกิจเก็บไว้ในเว็บตัวเองถูกจัดเป็น self-serving review
        และถูกตัดสิทธิ์ rich result มาตั้งแต่ปี 2019 — คอมเมนต์เดิมตรงนี้เข้าใจผิด

        ที่ยังประกาศไว้เพราะเครื่องมือค้นหาแบบ AI อ่าน JSON-LD ตรง ๆ เพื่อสรุปคำตอบ
        เวลามีคนถามว่า "เจ้าไหนดี" ข้อความรีวิวจริงพร้อมชื่อผู้รีวิวคือสิ่งที่มันหยิบไปใช้ได้
        ต่างจากตัวเลขเฉลี่ยลอย ๆ ที่ไม่มีอะไรรองรับ
      */}
      <JsonLd data={aggregateRatingSchema(stats.average, stats.total)} />
      <JsonLd
        data={{
          ...collectionPageSchema({
            name: t('title'),
            description: t('subtitle'),
            path: '/reviews',
            locale,
            items: reviews.map((review) => ({ name: review.authorName })),
          }),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: reviews.length,
            itemListElement: reviews.map((review, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: reviewSchema(review),
            })),
          },
        }}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('reviews'), path: localizedPath(locale, '/reviews') },
        ])}
      />

      <Section
        headingLevel="h1"
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <a href="#write" className={buttonClasses('outline', 'md')}>
            <PenLine size={16} strokeWidth={1.75} aria-hidden />
            {t('writeReview')}
          </a>
        }
      >
        {/* สรุปคะแนนเป็นแถบเดียว อ่านจากซ้ายไปขวา: คะแนนเฉลี่ย จำนวนรีวิว แล้วค่อยการกระจาย */}
        {stats.total > 0 && (
          <div className="review-summary">
            <div className="review-summary-score">
              <p className="tabular font-display">{stats.average.toFixed(1)}</p>
              <div>
                <RatingStars
                  rating={stats.average}
                  size={18}
                  label={t('starsOf', { rating: stats.average.toFixed(1) })}
                />
                <p>{t('averageRating')}</p>
              </div>
            </div>
            <div className="review-summary-count">
              <p className="tabular font-display">{formatNumber(stats.total, locale)}</p>
              <p>{t('totalReviews')}</p>
            </div>
            <div className="review-summary-bars">
              <p>{t('distribution')}</p>
              <ul>
                {stats.distribution.map((row) => (
                  <li key={row.star}>
                    <span className="tabular">{row.star}</span>
                    <span className="review-summary-track">
                      <span style={{ width: `${row.percent}%` }} />
                    </span>
                    <span className="tabular">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <ul className="reveal-stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="write"
        tone="subtle"
        eyebrow={t('writeReview')}
        title={t('formTitle')}
        align="center"
      >
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex gap-2.5 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
            <MessageSquareQuote
              size={16}
              strokeWidth={1.75}
              aria-hidden
              className="mt-0.5 shrink-0 text-accent"
            />
            <span className="text-pretty">{t('formNote')}</span>
          </div>

          <div className="rounded-lg border border-border bg-surface p-7 md:p-9">
            <ReviewForm />
          </div>
        </div>
      </Section>
    </>
  )
}
