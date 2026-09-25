import { ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { Badge } from '@/components/ui/Badge'
import { Section } from '@/components/ui/Section'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getPosts } from '@/server/queries'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structured-data'

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
  const t = await getTranslations({ locale, namespace: 'blog' })

  return pageMetadata({
    locale,
    path: '/blog',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function BlogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, tc, tNav, posts] = await Promise.all([
    getTranslations('blog'),
    getTranslations('common'),
    getTranslations('nav'),
    getPosts(),
  ])
  const isThai = locale === 'th'

  // บทความแรกขึ้นเป็นเรื่องเด่นเมื่อมีอย่างน้อยสามเรื่อง น้อยกว่านั้นเรียงเป็นกริดตามเดิม
  const featured = posts.length >= 3 ? posts[0] : undefined
  const rest = featured ? posts.slice(1) : posts

  const postMeta = (post: (typeof posts)[number]) => (
    <span className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted-foreground">
      {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt, locale)}</time>}
      {post.readingMinutes && (
        <>
          <span aria-hidden>·</span>
          <span>{t('readingTime', { minutes: post.readingMinutes })}</span>
        </>
      )}
    </span>
  )

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: t('title'),
          description: t('subtitle'),
          path: '/blog',
          locale,
          items: posts.map((post) => ({
            name: isThai ? post.titleTh : post.titleEn,
            path: `/blog/${post.slug}`,
          })),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('blog'), path: localizedPath(locale, '/blog') },
        ])}
      />

      <Section headingLevel="h1" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}>
        {posts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <>
            {/*
              บทความแรก (เด่นหรือใหม่สุด) วางเต็มแถว ภาพใหญ่คู่กับเกริ่นนำ แบบหน้าปกนิตยสาร
              หน้ารวมจึงมีจุดเริ่มอ่านที่ชัด ไม่ใช่การ์ดขนาดเท่ากันเรียงเป็นตาราง
            */}
            {featured && (
              <article className="post-feature group">
                <Link href={`/blog/${featured.slug}`} className="post-feature-link">
                  {featured.coverImage && (
                    <span className="post-feature-image">
                      <Image
                        src={featured.coverImage}
                        alt=""
                        fill
                        priority
                        sizes="(min-width: 1024px) 58vw, 100vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    </span>
                  )}
                  <span className="post-feature-copy">
                    {postMeta(featured)}
                    <h2 className="font-display text-balance">{isThai ? featured.titleTh : featured.titleEn}</h2>
                    <p>{isThai ? featured.excerptTh : featured.excerptEn}</p>
                    <span className="post-feature-more">
                      {tc('readMore')}
                      <ArrowUpRight size={17} aria-hidden />
                    </span>
                  </span>
                </Link>
              </article>
            )}

            {rest.length > 0 && (
              <ul
                className={cn(
                  'reveal-stagger mt-14 grid gap-x-8 gap-y-12 md:grid-cols-2',
                  rest.length % 3 === 0 || rest.length > 4 ? 'lg:grid-cols-3' : '',
                )}
              >
                {rest.map((post) => (
                  <li key={post.id}>
                    <article className="group h-full">
                      <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
                        {post.coverImage && (
                          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-subtle">
                            <Image
                              src={post.coverImage}
                              alt=""
                              fill
                              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            />
                          </div>
                        )}

                        <div className="mt-5 flex flex-1 flex-col">
                          {postMeta(post)}

                          <h2 className="mt-2 flex items-start gap-2 font-display text-2xl text-balance transition-colors group-hover:text-accent">
                            {isThai ? post.titleTh : post.titleEn}
                            <ArrowUpRight
                              size={17}
                              strokeWidth={1.75}
                              aria-hidden
                              className="mt-1.5 shrink-0 text-muted-foreground transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                            />
                          </h2>

                          <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">
                            {isThai ? post.excerptTh : post.excerptEn}
                          </p>

                          {post.tags.length > 0 && (
                            <ul className="mt-4 flex flex-wrap gap-1.5">
                              {post.tags.slice(0, 3).map((tag) => (
                                <li key={tag}>
                                  <Badge>{tag}</Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Section>
    </>
  )
}
