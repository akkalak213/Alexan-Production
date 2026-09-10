import { LoadingLabel } from '@/components/ui/LoadingLabel'
import { Skeleton, SkeletonGrid, SkeletonPage } from '@/components/ui/Skeleton'

/**
 * หน้าแรกอ่านข้อมูลสดทุกครั้ง (force-dynamic) ระหว่างรอจึงเคยเป็นจอขาวเปล่า ๆ
 * โครงนี้ล้อ hero ของจริง: สองคอลัมน์ตั้งแต่ lg และกล่องภาพสัดส่วนเดียวกัน
 * เพื่อให้ของจริงมาแทนที่ตรงตำแหน่งเดิม ไม่ใช่ดันเนื้อหาลงทั้งหน้า
 */
export default function Loading() {
  return (
    <SkeletonPage label={<LoadingLabel />}>
      <section className="relative overflow-hidden">
        <div className="container relative grid gap-10 py-14 md:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-5 h-14 w-full md:h-20" />
            <Skeleton className="mt-3 h-14 w-4/5 md:h-20" />
            <Skeleton className="mt-6 h-5 w-full max-w-xl" />
            <Skeleton className="mt-2 h-5 w-2/3 max-w-xl" />

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Skeleton className="h-12 w-full rounded-md sm:w-44" />
              <Skeleton className="h-12 w-full rounded-md sm:w-36" />
            </div>

            {/* แถบลิงก์บริการ — ของจริงมีหกอัน ความสูงเท่าปุ่มแตะขั้นต่ำ */}
            <div className="mt-8 flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-32 rounded-full" />
              ))}
            </div>

            <div className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-8">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-8 w-14" />
                </div>
              ))}
            </div>
          </div>

          <Skeleton className="aspect-[4/3] w-full rounded-lg lg:aspect-[4/5]" />
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mb-12 max-w-2xl md:mb-16">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-4 h-10 w-3/4" />
            <Skeleton className="mt-4 h-4 w-full" />
          </div>
          <SkeletonGrid count={6} aspect="aspect-[3/2]" />
        </div>
      </section>
    </SkeletonPage>
  )
}
