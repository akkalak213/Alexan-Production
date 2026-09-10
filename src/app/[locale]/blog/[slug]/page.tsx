import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Prose } from '@/components/ui/Prose'
import { JsonLd } from '@/components/JsonLd'
import { formatDate } from '@/lib/format'
import { articleSchema, breadcrumbSchema } from '@/lib/structured-data'
import { getPostBySlug } from '@/server/queries'

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

  const [t, tNav] = await Promise.all([getTranslations('blog'), getTranslations('nav')])
  const isThai = locale === 'th'

  const title = isThai ? post.titleTh : post.titleEn
  const excerpt = isThai ? post.excerptTh : post.excerptEn
  const body = isThai ? post.bodyTh : post.bodyEn

  return (
    <article className="py-14 md:py-20">
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

        <header className="max-w-3xl">
          {post.tags.length > 0 && (
            <ul className="mb-5 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="accent">{tag}</Badge>
                </li>
              ))}
            </ul>
          )}

          <h1 className="font-display text-display-lg text-balance">{title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">{excerpt}</p>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
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
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-lg border border-border bg-subtle">
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

        <div className="mt-12">
          <Prose>{body}</Prose>
        </div>
      </div>
    </article>
  )
}
