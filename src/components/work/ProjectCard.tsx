import { ArrowUpRight } from 'lucide-react'
import { ContentImage } from '@/components/ui/ContentImage'
import { getTranslations } from 'next-intl/server'
import type { ServiceCategory } from '@/generated/prisma/enums'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

export type ProjectCardData = {
  id: string
  slug: string
  category: ServiceCategory
  titleTh: string
  titleEn: string
  summaryTh: string
  summaryEn: string
  coverImage: string
  coverBlurData: string | null
  clientName: string | null
  year: number | null
}

type Props = {
  project: ProjectCardData
  locale: Locale
  /** ใบใหญ่ใช้กับผลงานเด่นใบแรก ให้จังหวะสายตาไม่ราบเรียบ */
  featured?: boolean
  /** A short, consistently sized preview for the homepage. */
  compact?: boolean
  priority?: boolean
}

export async function ProjectCard({ project, locale, featured, compact, priority }: Props) {
  const tCat = await getTranslations('serviceCategory')
  const tc = await getTranslations('common')
  const isThai = locale === 'th'

  const title = isThai ? project.titleTh : project.titleEn
  const summary = isThai ? project.summaryTh : project.summaryEn

  return (
    <article className={cn('group', compact && 'project-compact', featured && !compact && 'sm:col-span-2')}>
      <Link href={`/work/${project.slug}`} className="block">
        <div
          className={cn(
            'project-image relative overflow-hidden rounded-lg border border-border bg-subtle',
            featured || compact ? 'aspect-[16/9]' : 'aspect-[4/3]',
          )}
        >
          {/* ผลงานเก่าบางชิ้นอาจไม่มีรูปปก — next/image กับ src ว่างจะโยน error ทั้งหน้า */}
          {project.coverImage && (
          <ContentImage
            src={project.coverImage}
            alt=""
            unavailableLabel={tc('imageUnavailable')}
            fill
            priority={priority}
            sizes={featured ? '(min-width: 1024px) 66vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
            placeholder={project.coverBlurData ? 'blur' : 'empty'}
            blurDataURL={project.coverBlurData ?? undefined}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          )}
        </div>

        <div className="mt-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-accent">{tCat(project.category)}</span>
            {project.year && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular">{project.year}</span>
              </>
            )}
            {project.clientName && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{project.clientName}</span>
              </>
            )}
          </div>

          <h3 className="mt-2 flex items-start gap-2 font-display text-2xl text-balance">
            {title}
            <ArrowUpRight
              size={18}
              strokeWidth={1.75}
              aria-hidden
              className="mt-1.5 shrink-0 text-muted-foreground transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </h3>

          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
            {summary}
          </p>
        </div>
      </Link>
    </article>
  )
}
