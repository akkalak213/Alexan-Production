import { getTranslations } from 'next-intl/server'
import { Skeleton, SkeletonPage } from '@/components/ui/Skeleton'

/**
 * หน้านี้คือหน้าที่ลูกค้าตัดสินใจ ช่องกรอกจึงต้องโผล่มาตรงที่เดิมเป๊ะ
 * กล่องฟอร์มมีกรอบและ padding เท่าของจริง ไม่ใช่แค่แถบเทาลอย ๆ
 */
export default async function Loading() {
  const t = await getTranslations('common')

  return (
    <SkeletonPage label={t('loading')}>
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-5 h-11 w-full md:h-14" />
            <Skeleton className="mt-3 h-11 w-2/3 md:h-14" />
            <Skeleton className="mt-6 h-5 w-full" />
            <Skeleton className="mt-2 h-5 w-4/5" />
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
            <div className="rounded-lg border border-border bg-surface p-7 md:p-9">
              <Skeleton className="mb-7 h-8 w-48" />
              <div className="space-y-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index}>
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="mt-2 h-11 w-full rounded-md" />
                  </div>
                ))}
                <Skeleton className="h-28 w-full rounded-md" />
                <Skeleton className="h-12 w-40 rounded-md" />
              </div>
            </div>

            <aside className="space-y-10">
              {Array.from({ length: 2 }).map((_, block) => (
                <div key={block}>
                  <Skeleton className="mb-5 h-4 w-32" />
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, row) => (
                      <div key={row} className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 shrink-0 rounded" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
