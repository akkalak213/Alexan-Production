import { ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { buttonClasses } from '@/components/ui/Button'
import { ContactBand } from '@/components/ui/ContactBand'
import { Prose } from '@/components/ui/Prose'
import { JsonLd } from '@/components/JsonLd'
import { formatDate } from '@/lib/format'
import { markdownHeadings } from '@/lib/headings'
import { cn } from '@/lib/utils'
import { articleSchema, breadcrumbSchema } from '@/lib/structured-data'
import { getPostBySlug, getPosts } from '@/server/queries'

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


/**
 * ไม่ประกาศ generateStaticParams — เหตุผลเดียวกับหน้าบริการ
 * ตอน build บน Railway ไม่มีฐานข้อมูล ฟังก์ชันจะคืนค่าว่างแล้วทำให้หน้าตอบ 500
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}

  const isThai = locale === 'th'
  const title = (isThai ? post.seoTitleTh : post.seoTitleEn) ?? (isThai ? post.titleTh : post.titleEn)
  const description =
    (isThai ? post.seoDescriptionTh : post.seoDescriptionEn) ??
    (isThai ? post.excerptTh : post.excerptEn)

  return pageMetadata({
    locale,
    path: `/blog/${slug}`,
    title,
    description,
    image: post.coverImage,
    type: 'article',
    publishedTime: post.publishedAt?.toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
  })
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const [t, tc, tNav, tHome, tContact, allPosts] = await Promise.all([
    getTranslations('blog'),
    getTranslations('common'),
    getTranslations('nav'),
    getTranslations('home'),
    getTranslations('contact'),
    // บทความล่าสุด 24 เรื่องพอให้หาเรื่องที่แท็กตรงกันได้ บทความเพิ่มเป็นร้อยก็ไม่ต้องดึงทั้งตาราง
    getPosts(24),
  ])
  const isThai = locale === 'th'

  const title = isThai ? post.titleTh : post.titleEn
  const excerpt = isThai ? post.excerptTh : post.excerptEn
  const body = isThai ? post.bodyTh : post.bodyEn
  const headings = markdownHeadings(body)

  // บทความอื่นที่แท็กซ้ำกับเรื่องนี้มากที่สุดมาก่อน ถ้าไม่มีแท็กตรงกันก็เรียงตามลำดับเดิม (เด่น ใหม่)
  const related = allPosts
    .filter((other) => other.id !== post.id)
    .map((other, order) => ({ other, order, shared: other.tags.filter((tag) => post.tags.includes(tag)).length }))
    .sort((a, b) => b.shared - a.shared || a.order - b.order)
    .slice(0, 3)
    .map(({ other }) => other)

  return (
    <>
      {/* แถบความคืบหน้าการอ่าน วาดด้วย CSS ล้วน (scroll-driven animation) เบราว์เซอร์ที่ไม่รองรับก็แค่ไม่เห็นแถบ */}
      <div className="reading-progress" aria-hidden />
      <article className="pb-6 pt-10 md:pt-14">
        <JsonLd
          data={articleSchema({
            title,
            description: excerpt,
            slug,
            locale,
            image: post.coverImage,
            publishedAt: post.publishedAt,
            updatedAt: post.updatedAt,
            authorName: post.author?.name ?? null,
          })}
        />
        <JsonLd
          data={breadcrumbSchema([
            { name: tNav('home'), path: localizedPath(locale) },
            { name: tNav('blog'), path: localizedPath(locale, `/blog`) },
            { name: title, path: localizedPath(locale, `/blog/${slug}`) },
          ])}
        />

        <div className="container">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('blog'), href: '/blog' },
              { label: title },
            ]}
          />

          <header className="post-header">
            {post.tags.length > 0 && (
              <ul className="mb-5 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Badge variant="accent">{tag}</Badge>
                  </li>
                ))}
              </ul>
            )}

            <h1 className="post-title font-display text-balance">{title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground text-pretty">{excerpt}</p>

            <div className="post-meta">
              {post.publishedAt && (
                <time dateTime={post.publishedAt.toISOString()}>
                  {formatDate(post.publishedAt, locale)}
                </time>
              )}
              {post.readingMinutes && <span>{t('readingTime', { minutes: post.readingMinutes })}</span>}
              {post.author?.name && (
                <span>
                  {t('writtenBy')} <span className="text-foreground">{post.author.name}</span>
                </span>
              )}
            </div>
          </header>

          {post.coverImage && (
            <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-subtle md:aspect-[21/9]">
              <Image
                src={post.coverImage}
                alt=""
                fill
                priority
                sizes="(min-width: 1360px) 1300px, 100vw"
                placeholder={post.coverBlurData ? 'blur' : 'empty'}
                blurDataURL={post.coverBlurData ?? undefined}
                className="object-cover"
              />
            </div>
          )}

          <div className="post-layout">
            <Prose className="post-body">{body}</Prose>

            {/* ด้านขวาของบทความ: สารบัญ + ทางไปคุยงาน ค้างอยู่ระหว่างอ่าน จอเล็กซ่อนไปเพราะไม่มีที่ */}
            <aside className="post-aside">
              {headings.length > 1 && (
                <nav aria-labelledby="toc-title" className="post-toc">
                  <p id="toc-title">{t('tocTitle')}</p>
                  <ol>
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a href={`#${heading.id}`}>{heading.text.replace(/^\d+[.)]\s+/, '')}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              <div className="post-cta">
                <p className="font-display">{t('ctaTitle')}</p>
                <span>{t('ctaBody')}</span>
                <Link href="/contact" className={buttonClasses('accent', 'md', 'w-full')}>
                  {tc('getQuote')}
                  <ArrowUpRight size={17} aria-hidden />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="border-t border-border bg-subtle py-16 md:py-20">
          <div className="container">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 id="related-title" className="font-display text-display-sm">
                {t('relatedTitle')}
              </h2>
              <Link href="/blog" className="text-link">
                {t('allPosts')}
                <ArrowUpRight size={17} aria-hidden />
              </Link>
            </div>
            <ul className={cn('grid gap-8', related.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
              {related.map((other) => (
                <li key={other.id}>
                  <Link href={`/blog/${other.slug}`} className="post-related group">
                    {other.coverImage && (
                      <span className="relative block aspect-[16/10] overflow-hidden rounded-xl border border-border bg-background">
                        <Image
                          src={other.coverImage}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                      </span>
                    )}
                    <span className="mt-4 block text-[0.8125rem] text-muted-foreground">
                      {other.publishedAt && formatDate(other.publishedAt, locale)}
                      {other.readingMinutes && <> · {t('readingTime', { minutes: other.readingMinutes })}</>}
                    </span>
                    <span className="mt-1.5 block font-display text-xl leading-normal text-balance transition-colors group-hover:text-accent">
                      {isThai ? other.titleTh : other.titleEn}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <ContactBand
        eyebrow={tHome('ctaNote')}
        title={tHome('ctaTitle')}
        subtitle={tHome('ctaSubtitle')}
        actionLabel={tc('getQuote')}
        note={tContact('responseNote')}
      />
    </>
  )
}
