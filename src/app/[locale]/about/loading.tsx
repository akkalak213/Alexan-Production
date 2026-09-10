import { getTranslations } from 'next-intl/server'
import { PageHeaderSkeleton, Skeleton, SkeletonPage, SkeletonText } from '@/components/ui/Skeleton'

export default async function Loading() {
  const t = await getTranslations('common')

  return (
    <SkeletonPage label={t('loading')}>
      <PageHeaderSkeleton width="max-w-3xl" bordered />

      {/* จุดเริ่มต้น — สามย่อหน้าวางเรียงเป็นคอลัมน์ตั้งแต่ lg เหมือนของจริง */}
      <section className="py-20 md:py-28">
        <div className="container">
          <Skeleton className="mb-12 h-9 w-64 md:mb-16" />
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonText key={index} lines={5} />
            ))}
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
