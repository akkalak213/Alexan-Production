import { cn } from '@/lib/utils'

/**
 * โครงร่างระหว่างรอข้อมูล
 *
 * ใช้ animate-pulse ซึ่งขยับแค่ opacity — รันบน compositor ไม่ทำให้เฟรมตก
 * ต่างจาก shimmer ที่เลื่อน background-position ซึ่งบังคับให้เบราว์เซอร์ repaint ทุกเฟรม
 *
 * ทุกชิ้นเป็น aria-hidden เพราะ screen reader ไม่ควรอ่านกล่องเปล่า
 * ตัวหน้าที่ประกาศสถานะโหลดคือ role="status" ที่ครอบอยู่ชั้นนอก
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

/** การ์ดผลงาน/บทความ — สัดส่วนต้องตรงกับของจริงไม่งั้นหน้าจะกระตุกตอนข้อมูลมาถึง */
export function SkeletonCard({ aspect = 'aspect-[4/3]' }: { aspect?: string }) {
  return (
    <div className="space-y-4">
      <Skeleton className={cn('w-full rounded-lg', aspect)} />
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
      </div>
    </div>
  )
}

export function SkeletonGrid({
  count = 6,
  aspect,
  className,
}: {
  count?: number
  aspect?: string
  className?: string
}) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} aspect={aspect} />
      ))}
    </div>
  )
}

/** ครอบ skeleton ทั้งหน้าเพื่อบอก screen reader ว่ากำลังโหลด */
export function SkeletonPage({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** หน้ารวมรายการ: หัวเรื่อง + แถบกรอง + กริดการ์ด */
export function ListingSkeleton({
  label,
  count = 6,
  aspect,
  showFilters = true,
}: {
  label: string
  count?: number
  aspect?: string
  showFilters?: boolean
}) {
  return (
    <SkeletonPage label={label}>
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mb-12 max-w-2xl space-y-4 md:mb-16">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>

          {showFilters && (
            <div className="mb-10 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-28 rounded-full" />
              ))}
            </div>
          )}

          <SkeletonGrid count={count} aspect={aspect} />
        </div>
      </section>
    </SkeletonPage>
  )
}

/**
 * หัวเรื่องของหน้า — บล็อก eyebrow + h1 สองบรรทัด + คำโปรย ที่หลายหน้าใช้ร่วมกัน
 * ระยะห่างล้อของจริงทุกค่า เพราะถ้าเตี้ยกว่าหรือสูงกว่า เนื้อหาจะกระโดดตอนข้อมูลมาแทน
 */
export function PageHeaderSkeleton({
  width = 'max-w-2xl',
  bordered = false,
}: {
  width?: string
  bordered?: boolean
}) {
  return (
    <section className={cn('py-16 md:py-24', bordered && 'border-b border-border')}>
      <div className="container">
        <div className={width}>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-5 h-11 w-full md:h-14" />
          <Skeleton className="mt-3 h-11 w-2/3 md:h-14" />
          <Skeleton className="mt-6 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-4/5" />
        </div>
      </div>
    </section>
  )
}

/** หน้ารายละเอียด: breadcrumb + หัวเรื่องใหญ่ + ภาพปก + เนื้อหา */
export function DetailSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPage label={label}>
      <section className="border-b border-border py-14 md:py-20">
        <div className="container">
          <Skeleton className="mb-8 h-4 w-64" />
          <div className="max-w-3xl space-y-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-2/3" />
            <SkeletonText lines={2} className="pt-2" />
          </div>
        </div>
      </section>

      <div className="container py-14">
        <Skeleton className="aspect-[16/9] w-full rounded-lg" />
        <div className="mt-12 max-w-2xl">
          <SkeletonText lines={6} />
        </div>
      </div>
    </SkeletonPage>
  )
}
