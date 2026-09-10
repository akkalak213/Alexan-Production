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

  const [t, tNav, posts] = await Promise.all([
    getTranslations('blog'),
    getTranslations('nav'),
    getPosts(),
  ])
  const isThai = locale === 'th'

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

    <Section eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}>
      {posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ul className="reveal-stagger grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <li key={post.id}>
              <article className="group h-full">
                <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
                  {post.coverImage && (
                    <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-subtle">
                      <Image
                        src={post.coverImage}
                        alt=""
                        fill
                        priority={index < 3}
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                  )}

                  <div className="mt-5 flex flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt, locale)}</time>}
                      {post.readingMinutes && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{t('readingTime', { minutes: post.readingMinutes })}</span>
                        </>
                      )}
                    </div>

                    <h2 className="mt-2 flex items-start gap-2 font-display text-2xl text-balance">
                      {isThai ? post.titleTh : post.titleEn}
                      <ArrowUpRight
                        size={17}
                        strokeWidth={1.75}
                        aria-hidden
                        className="mt-1.5 shrink-0 text-muted-foreground transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                      />
                    </h2>

                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
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
    </Section>
    </>
  )
}
