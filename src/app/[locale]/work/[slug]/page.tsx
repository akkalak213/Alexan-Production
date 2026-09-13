import { ExternalLink, Github } from 'lucide-react'
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
import { Prose } from '@/components/ui/Prose'
import { Section } from '@/components/ui/Section'
import { MediaGallery, type GalleryItem } from '@/components/work/MediaGallery'
import { ProjectCard } from '@/components/work/ProjectCard'
import { VideoEmbed } from '@/components/work/VideoEmbed'
import { JsonLd } from '@/components/JsonLd'
import { safeExternalUrl } from '@/lib/external-link'
import { parseVideoUrl, videoEmbedUrl, videoThumbnailUrl } from '@/lib/format'
import { breadcrumbSchema, creativeWorkSchema, videoObjectSchema } from '@/lib/structured-data'
import { getProjectBySlug, getRelatedProjects } from '@/server/queries'

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


type Credit = { role: string; name: string }

function asCredits(value: unknown): Credit[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Credit =>
      typeof item === 'object' && item !== null && 'role' in item && 'name' in item,
  )
}

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
  const project = await getProjectBySlug(slug)
  if (!project) return {}

  const isThai = locale === 'th'
  const title = (isThai ? project.seoTitleTh : project.seoTitleEn) ?? (isThai ? project.titleTh : project.titleEn)
  const description =
    (isThai ? project.seoDescriptionTh : project.seoDescriptionEn) ??
    (isThai ? project.summaryTh : project.summaryEn)

  return pageMetadata({
    locale,
    path: `/work/${slug}`,
    title,
    description,
    image: project.coverImage || null,
    type: 'article',
    modifiedTime: project.updatedAt.toISOString(),
  })
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  const [t, tNav, tCat, related] = await Promise.all([
    getTranslations('work'),
    getTranslations('nav'),
    getTranslations('serviceCategory'),
    getRelatedProjects(project.category, project.id),
  ])

  const isThai = locale === 'th'
  const title = isThai ? project.titleTh : project.titleEn
  const summary = isThai ? project.summaryTh : project.summaryEn
  const body = isThai ? project.bodyTh : project.bodyEn
  const credits = asCredits(isThai ? project.creditsTh : project.creditsEn)

  const video = parseVideoUrl(project.videoUrl)

  /**
   * สองลิงก์นี้แอดมินพิมพ์เข้ามาเอง ไม่ใช่ค่าที่เขียนไว้ในโค้ด
   * ฟอร์มกันตั้งแต่ตอนบันทึกแล้ว แต่ระเบียนที่บันทึกไว้ก่อนหน้านั้นยังไม่เคยผ่านการตรวจ
   * จึงต้องกรองตอนเรนเดอร์ด้วย ค่าที่ไม่ผ่านจะไม่ขึ้นเป็นปุ่มเลย ดีกว่าปุ่มที่กดแล้วรันสคริปต์
   */
  const liveUrl = safeExternalUrl(project.liveUrl)
  const repoUrl = safeExternalUrl(project.repoUrl)
  const isVisualWork = project.category === 'PHOTOGRAPHY' || project.category === 'STUDIO'
  const isSoftwareWork =
    project.category === 'WEB' || project.category === 'WEB_APP' || project.category === 'MOBILE_APP'

  /**
   * ภาพที่ยังไม่ได้กรอกคำอธิบาย ใช้คำบรรยายภาพ ถ้าไม่มีอีกใช้ชื่องานกับลำดับภาพ
   * alt ว่างทำให้โปรแกรมอ่านหน้าจอได้ยินแค่ "เปิดภาพ" ซ้ำทุกภาพ และค้นหาภาพของ Google ไม่มีข้อความให้จัดอันดับ
   */
  const gallery: GalleryItem[] = project.media
    .filter((m) => m.type === 'IMAGE')
    .map((m, index, all) => {
      const caption = isThai ? m.captionTh : m.captionEn
      return {
        id: m.id,
        url: m.url,
        width: m.width,
        height: m.height,
        blurData: m.blurData,
        caption,
        alt: (isThai ? m.altTh : m.altEn) || caption || `${title} (${index + 1}/${all.length})`,
      }
    })

  return (
    <>
      <JsonLd
        data={creativeWorkSchema({
          title,
          description: summary,
          slug,
          locale,
          image: project.coverImage,
          year: project.year,
          clientName: project.clientName,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('work'), path: localizedPath(locale, `/work`) },
          { name: title, path: localizedPath(locale, `/work/${slug}`) },
        ])}
      />
      {/*
        VideoObject เป็นหนึ่งในไม่กี่ชนิดที่ยังได้ผลค้นหาแบบมีรูปตัวอย่างวิดีโอจริง
        ผลงานที่ไม่มีรูปปกและไม่มีวันเผยแพร่จะคืน null แทนที่จะส่งข้อมูลไม่ครบออกไป
        เพราะ Google ข้ามทั้งก้อนอยู่ดีถ้าขาด thumbnailUrl หรือ uploadDate
      */}
      {video && (
        <JsonLd
          data={videoObjectSchema({
            name: title,
            description: summary,
            thumbnail: project.coverImage || videoThumbnailUrl(video),
            embedUrl: videoEmbedUrl(video),
            uploadDate: project.publishedAt ?? project.updatedAt,
          })}
        />
      )}

      <section className="border-b border-border py-14 md:py-20">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('work'), href: '/work' },
              { label: title },
            ]}
          />

          <Badge variant="accent">{tCat(project.category)}</Badge>
          <h1 className="mt-5 max-w-4xl font-display text-display-lg text-balance">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            {summary}
          </p>

          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-5 border-t border-border pt-8 text-sm">
            {project.clientName && (
              <div>
                <dt className="text-muted-foreground">{t('client')}</dt>
                <dd className="mt-1 font-medium">{project.clientName}</dd>
              </div>
            )}
            {project.year && (
              <div>
                <dt className="text-muted-foreground">{t('year')}</dt>
                <dd className="tabular mt-1 font-medium">{project.year}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">{t('category')}</dt>
              <dd className="mt-1 font-medium">{tCat(project.category)}</dd>
            </div>
          </dl>

          {(liveUrl || repoUrl) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {liveUrl && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClasses('primary', 'md')}
                >
                  {t('visitSite')}
                  <ExternalLink size={15} strokeWidth={1.75} aria-hidden />
                </a>
              )}
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClasses('outline', 'md')}
                >
                  <Github size={15} strokeWidth={1.75} aria-hidden />
                  {t('viewRepo')}
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/*
        สื่อหลักเปลี่ยนตามประเภทงาน:
        งานวิดีโอขึ้นเครื่องเล่นก่อน ส่วนงานอื่นขึ้นภาพปกเต็มความกว้าง
      */}
      <div className="container py-12 md:py-16">
        {video ? (
          <VideoEmbed
            source={video}
            poster={project.coverImage || videoThumbnailUrl(video)}
            title={title}
            playLabel={t('watchVideo')}
          />
        ) : (
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-subtle">
            {/* ผลงานเก่าบางชิ้นอาจไม่มีรูปปก — next/image กับ src ว่างจะโยน error ทั้งหน้า */}
            {project.coverImage && (
            <Image
              src={project.coverImage}
              alt=""
              fill
              priority
              sizes="(min-width: 1360px) 1300px, 100vw"
              placeholder={project.coverBlurData ? 'blur' : 'empty'}
              blurDataURL={project.coverBlurData ?? undefined}
              className="object-cover"
            />
            )}
          </div>
        )}
      </div>

      {(body || project.techStack.length > 0 || credits.length > 0) && (
        <div className="container pb-8">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-20">
            <div>
              {body ? (
                <Prose>{body}</Prose>
              ) : (
                <div className="max-w-2xl">
                  <h2 className="font-display text-3xl">{t('overview')}</h2>
                  <p className="mt-4 leading-relaxed text-muted-foreground text-pretty">{summary}</p>
                </div>
              )}
            </div>

            <aside className="space-y-10 lg:pt-2">
              {isSoftwareWork && project.techStack.length > 0 && (
                <div>
                  <h2 className="mb-4 text-sm font-medium">{t('techStack')}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {project.techStack.map((tech) => (
                      <li key={tech}>
                        <Badge variant="outline">{tech}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {credits.length > 0 && (
                <div>
                  <h2 className="mb-4 text-sm font-medium">{t('credits')}</h2>
                  <dl className="space-y-2.5 text-sm">
                    {credits.map((credit) => (
                      <div key={`${credit.role}-${credit.name}`} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{credit.role}</dt>
                        <dd className="text-right font-medium">{credit.name}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {project.service && (
                <div>
                  <h2 className="mb-3 text-sm font-medium">{tCat(project.category)}</h2>
                  <Link
                    href={`/services/${project.service.slug}`}
                    className="text-sm text-accent underline underline-offset-4 hover:no-underline"
                  >
                    {isThai ? project.service.titleTh : project.service.titleEn}
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {gallery.length > 0 && (
        <Section title={t('gallery')}>
          {/* งานภาพและงานสตูดิโอใช้ masonry เพราะมีทั้งแนวตั้งแนวนอนคละกัน */}
          <MediaGallery items={gallery} layout={isVisualWork ? 'masonry' : 'grid'} />
        </Section>
      )}

      {related.length > 0 && (
        <Section tone="subtle" title={t('relatedTitle')}>
          <div className="reveal-stagger grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProjectCard key={item.id} project={item} locale={locale} />
            ))}
          </div>
        </Section>
      )}
    </>
  )
}
