import { ArrowRight, ArrowUpRight, Lightbulb, PackageOpen, SlidersHorizontal, Star } from 'lucide-react'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { ServiceIcon } from '@/components/ui/ServiceIcon'
import { EquipmentIcon } from '@/components/ui/EquipmentIcon'
import { StudioScene } from '@/components/home/StudioScene'
import { ProjectCard } from '@/components/work/ProjectCard'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { getSiteSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'
import { isPlaceholderImage } from '@/lib/sample-content'
import {
  getActiveServices,
  getApprovedReviews,
  getEquipment,
  getFeaturedProjects,
  getHomeStats,
} from '@/server/queries'

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


export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, tc, tEquip, tCat, settings, services, stats, equipment, featured, reviews] =
    await Promise.all([
      getTranslations('home'),
      getTranslations('common'),
      getTranslations('equipmentCategory'),
      getTranslations('serviceCategory'),
      getSiteSettings(),
      getActiveServices(),
      getHomeStats(),
      getEquipment(),
      getFeaturedProjects(4),
      getApprovedReviews(3),
    ])

  const isThai = locale === 'th'
  const { hero } = settings

  /**
   * ผลงานชิ้นแรกที่มีรูปปกจริงใช้เป็นภาพใน hero ที่เหลือไปอยู่ส่วนผลงานเด่นด้านล่าง
   * ถ้าไม่มีผลงานเลย hero จะเหลือคอลัมน์เดียวแทนที่จะมีช่องว่างค้างไว้
   *
   * ต้องเช็ครูปปกด้วย ไม่ใช่หยิบชิ้นแรกมาดื้อ ๆ — ชิ้นที่รูปปกว่างจะทำให้ next/image ล้มทั้งหน้า
   * และถ้าข้ามไปเฉย ๆ ผลงานชิ้นนั้นจะหายไปจากหน้าแรกทั้งที่ตั้งเป็นผลงานเด่นไว้
   */
  const heroIndex = featured.findIndex((project) => project.coverImage && !isPlaceholderImage(project.coverImage))
  const heroProject = heroIndex >= 0 ? featured[heroIndex] : null
  const restFeatured = featured.filter((_, index) => index !== heroIndex)

  /**
   * จัดอุปกรณ์เข้าหมวดจากข้อมูลจริงในคลัง ไม่ได้เขียนรายการไว้ตายตัว
   * เพิ่มหรือลดของในหลังบ้านเมื่อไหร่ หน้าแรกก็เปลี่ยนตามเอง
   */
  const gearByCategory = equipment.reduce<
    Record<string, { count: number; models: string[] }>
  >((acc, item) => {
    const group = (acc[item.category] ??= { count: 0, models: [] })
    group.count += 1
    if (group.models.length < 2) group.models.push(`${item.brand} ${item.model}`)
    return acc
  }, {})

  const gearGroups = Object.entries(gearByCategory).sort((a, b) => b[1].count - a[1].count)

  // ชื่อรุ่นทั้งหมดสำหรับแถบเลื่อน ทำซ้ำสองชุดเพื่อให้วนแล้วไม่เห็นรอยต่อ
  const gearNames = equipment.map((item) => `${item.brand} ${item.model}`)

  const studioPoints = [
    { icon: PackageOpen, title: t('studioPointGearTitle'), text: t('studioPointGearText') },
    { icon: Lightbulb, title: t('studioPointLightTitle'), text: t('studioPointLightText') },
    { icon: SlidersHorizontal, title: t('studioPointRentTitle'), text: t('studioPointRentText') },
  ]

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="grain relative overflow-hidden border-b border-border">
        {/* แสงนวลจากมุมบนขวา เลียนแบบไฟคีย์ในสตูดิโอ ขยับช้ามากให้ฉากไม่นิ่งสนิท */}
        <div
          aria-hidden
          className="keylight pointer-events-none absolute -right-1/4 -top-1/2 h-[130%] w-[80%] rounded-full bg-accent/10 blur-[120px]"
        />

        <div
          className={cn(
            "container relative grid gap-8 py-10 md:py-16 lg:items-center lg:gap-16 lg:py-20",
            heroProject && "lg:grid-cols-[1.15fr_1fr]",
          )}
        >
          {/* stage ไล่จังหวะให้ลูกทีละชิ้น หัวเรื่องเปิดแบบม่านรูดขึ้นแยกต่างหาก */}
          <div className="hero-stage min-w-0">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.16em] text-accent">
              {isThai ? hero.eyebrowTh : hero.eyebrowEn}
            </p>

            <h1 className="hero-title font-display text-balance">
              {isThai ? hero.headlineTh : hero.headlineEn}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              {isThai ? hero.subheadlineTh : hero.subheadlineEn}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className={buttonClasses('accent', 'lg')}>
                {tc('getQuote')}
                <ArrowRight size={18} strokeWidth={1.75} />
              </Link>
              <Link href="/work" className={buttonClasses('outline', 'lg')}>
                {tc('viewWork')}
              </Link>
            </div>

          </div>

          {/*
            เดิมตรงนี้เป็นกล่องเปล่าเขียนว่า Showreel · 2026 ซึ่งเป็นที่จองไว้รอวิดีโอโชว์รีล
            แต่โชว์รีลยังไม่มี กล่องจึงกลายเป็นการโฆษณาของที่ยังไม่มีอยู่จริง
            เปลี่ยนเป็นผลงานเด่นชิ้นแรกจากฐานข้อมูล กดแล้วไปหน้าผลงานได้เลย
          */}
          {heroProject && (
            <Link
              href={`/work/${heroProject.slug}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-lg border border-border bg-subtle lg:aspect-[4/5]"
            >
              <Image
                src={heroProject.coverImage}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                placeholder={heroProject.coverBlurData ? 'blur' : 'empty'}
                blurDataURL={heroProject.coverBlurData ?? undefined}
                className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              />
              {/* ไล่สีทึบที่ก้นภาพ ตัวหนังสือจึงอ่านออกไม่ว่าภาพข้างล่างจะสว่างแค่ไหน */}
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240_20%_4%/0.88)] via-[hsl(240_20%_4%/0.15)] to-transparent" />
              <div className="absolute inset-x-7 bottom-7">
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-white/80">
                  {tCat(heroProject.category)}
                </p>
                <p className="mt-1.5 font-display text-2xl text-balance text-white">
                  {isThai ? heroProject.titleTh : heroProject.titleEn}
                </p>
              </div>
            </Link>
          )}
        </div>
        <div className="container pb-10 md:pb-16">
            {services.length > 0 && (
              <nav aria-label={t('servicesEyebrow')} className="mt-8 flex flex-wrap gap-2">
                {services.map((service) => (
                  <Link
                    key={service.id}
                    href={`/services/${service.slug}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                  >
                    {isThai ? service.titleTh : service.titleEn}
                    <ArrowUpRight size={14} aria-hidden />
                  </Link>
                ))}
              </nav>
            )}

            {(stats.projects > 0 || stats.reviewCount > 0) && (
              <dl className="mt-8 flex flex-wrap gap-8 border-t border-border pt-6">
                {stats.projects > 0 && <div><dt className="text-sm text-muted-foreground">{t('statsProjects')}</dt><dd className="tabular mt-1 font-display text-3xl">{stats.projects}</dd></div>}
                {stats.reviewCount > 0 && <div><dt className="text-sm text-muted-foreground">{t('statsRating')}</dt><dd className="tabular mt-1 flex items-center gap-2 font-display text-3xl">{stats.averageRating.toFixed(1)}<Star size={16} className="fill-accent text-accent" aria-hidden /></dd></div>}
              </dl>
            )}
        </div>
      </section>

      {/* ───────────── บริการ ───────────── */}
      <Section
        id="services"
        tone="subtle"
        eyebrow={t('servicesEyebrow')}
        title={t('servicesTitle')}
        subtitle={t('servicesSubtitle')}
        action={
          <Link href="/services" className={buttonClasses('outline', 'md')}>
            {tc('viewAll')}
          </Link>
        }
      >
        {services.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {tc('empty')}
          </p>
        ) : (
          <ul className="reveal-stagger grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.id} className="bg-background">
                <Link
                  href={`/services/${service.slug}`}
                  className={cn(
                    'group relative flex h-full flex-col gap-4 p-8 transition-colors hover:bg-subtle',
                    // เส้นสีเน้นลากผ่านขอบบนตอนชี้ แทนการยกการ์ดขึ้นซึ่งจะทำให้รอยต่อกริดแยกออกจากกัน
                    'before:absolute before:inset-x-0 before:top-0 before:h-px before:origin-left',
                    'before:scale-x-0 before:bg-accent before:transition-transform before:duration-300',
                    'before:ease-out hover:before:scale-x-100',
                  )}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent-subtle text-accent transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-105">
                    <ServiceIcon name={service.icon} size={20} strokeWidth={1.6} />
                  </span>
                  <h3 className="font-display text-2xl">
                    {isThai ? service.titleTh : service.titleEn}
                  </h3>
                  <p className="flex-1 text-base leading-relaxed text-muted-foreground text-pretty">
                    {isThai ? service.taglineTh : service.taglineEn}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                    {tc('learnMore')}
                    <ArrowUpRight
                      size={15}
                      strokeWidth={2}
                      aria-hidden
                      className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ───────────── ในสตูดิโอ ───────────── */}
      {/*
        border-y เพื่อให้ยังเห็นรอยต่อในโหมดมืด ที่พื้นหน้ากับพื้นแผงต่างกันแค่ไม่กี่เปอร์เซ็นต์

        ส่วนนี้ไม่ผูกกับข้อมูลในฐานข้อมูล ภาพฉากกับคำอธิบายขึ้นเสมอ
        มีแต่รายการหมวดอุปกรณ์ที่ซ่อนเมื่อคลังว่าง ตอนแรกครอบเงื่อนไขไว้ทั้งก้อน
        พอ build บน Railway ต่อฐานข้อมูลไม่ได้ ทั้งส่วนเลยหายไปจากหน้าจริงทั้งดุ้น
      */}
      <section className="studio-panel relative overflow-hidden border-y border-border">
        <div className="container relative pb-14 pt-20 md:pb-16 md:pt-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div className="reveal">
              <p className="rule-draw mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">
                {t('studioEyebrow')}
              </p>
              <h2 className="font-display text-display-md text-balance">{t('studioTitle')}</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
                {t('studioSubtitle')}
              </p>

              <dl className="mt-10 flex gap-12 border-t border-border pt-8">
                <div>
                  <dt className="text-xs text-muted-foreground">{t('studioStatGear')}</dt>
                  <dd className="tabular mt-1 font-display text-4xl">{equipment.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('studioStatCategories')}</dt>
                  <dd className="tabular mt-1 font-display text-4xl">{gearGroups.length}</dd>
                </div>
              </dl>
            </div>

            {/* จุดขายอยู่คนละคอลัมน์กับหัวเรื่อง สองฝั่งจึงหนักพอกันแทนที่จะกองอยู่ข้างเดียว */}
            <div className="reveal lg:pt-2">
              <ul className="space-y-7">
                {studioPoints.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
                      <Icon size={17} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link href="/rental" className={buttonClasses('accent', 'lg', 'mt-9')}>
                {t('studioCta')}
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
              </Link>
            </div>
          </div>

          {/* หมวดอุปกรณ์พร้อมจำนวนและตัวอย่างรุ่น อ่านจากคลังจริง */}
          {gearGroups.length > 0 && (
            <ul
              className={cn(
                'reveal-stagger mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border',
                'sm:grid-cols-2 lg:grid-cols-4',
                // จำนวนหมวดหารไม่ลงตัวได้ ช่องที่เหลือจะกลายเป็นบล็อกสีขอบทึบ ๆ
                // ให้ใบสุดท้ายยืดกินช่องที่เหลือ กริดจึงเต็มเสมอไม่ว่าจะมีกี่หมวด
                'sm:[&>li:last-child:nth-child(odd)]:col-span-2',
                'lg:[&>li:last-child:nth-child(4n+1)]:col-span-4',
                'lg:[&>li:last-child:nth-child(4n+2)]:col-span-3',
                'lg:[&>li:last-child:nth-child(4n+3)]:col-span-2',
              )}
            >
              {gearGroups.map(([category, group]) => (
                <li key={category} className="bg-background p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent-subtle text-accent">
                    <EquipmentIcon
                      category={category as Parameters<typeof EquipmentIcon>[0]['category']}
                      size={19}
                      strokeWidth={1.6}
                      aria-hidden
                    />
                  </span>
                  <p className="mt-4 font-medium">{tEquip(category)}</p>
                  <p className="tabular mt-1 text-xs text-muted-foreground">
                    {group.count} {t('studioItemsUnit')}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {group.models.join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* แถบชื่อรุ่นอุปกรณ์เลื่อนช้า ๆ ให้เห็นว่าคลังลึกแค่ไหนโดยไม่ต้องลิสต์ทั้งหมด */}
        {gearNames.length > 0 && (
          <div
            aria-hidden
            className="fade-edges-x relative overflow-hidden border-y border-border py-5"
          >
            <div className="marquee-track">
              {[0, 1].map((copy) => (
                <ul key={copy} className="flex shrink-0 items-center">
                  {/* ชื่อรุ่นซ้ำกันได้ถ้ามีของรุ่นเดียวกันหลายตัว จึงใช้ลำดับเป็น key ไม่ใช่ชื่อ */}
                  {gearNames.map((name, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-6 whitespace-nowrap px-6 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      {name}
                      <span className="h-1 w-1 rounded-full bg-accent/60" />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        )}

        {/*
          ฉากสตูดิโออยู่ล่างสุดของแผง เส้นพื้นจึงเป็นขอบล่างของ section พอดี
          ไม่ได้อยู่ในคอนเทนเนอร์ ไม่มีกรอบ ไม่มีพื้นหลังของตัวเอง
          ข้อความและการ์ดด้านบนจึงอ่านเป็นของที่ตั้งอยู่ในห้องเดียวกับฉาก
          ไม่ใช่ข้อความที่มีรูปแปะอยู่ข้าง ๆ แบบเดิม
        */}
        <StudioScene className="block h-[190px] w-full sm:h-[240px] lg:h-[300px]" />
      </section>

      {/* ───────────── ผลงานเด่น ชิ้นแรกไปอยู่ใน hero แล้ว ที่นี่จึงเป็นชิ้นที่เหลือ ───────────── */}
      {restFeatured.length > 0 && (
        <Section
          eyebrow={t('workEyebrow')}
          title={t('workTitle')}
          subtitle={t('workSubtitle')}
          action={
            <Link href="/work" className={buttonClasses('outline', 'md')}>
              {t('workCta')}
            </Link>
          }
        >
          <div className="reveal-stagger grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {restFeatured.map((project) => (
              <ProjectCard key={project.id} project={project} locale={locale} />
            ))}
          </div>
        </Section>
      )}

      {/* ───────────── เสียงจากลูกค้า ───────────── */}
      {reviews.length > 0 && (
        <Section
          tone="subtle"
          eyebrow={t('reviewsEyebrow')}
          title={t('reviewsTitle')}
          subtitle={t('reviewsSubtitle')}
          action={
            <Link href="/reviews" className={buttonClasses('outline', 'md')}>
              {t('reviewsCta')}
            </Link>
          }
        >
          <ul className="reveal-stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} locale={locale} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ───────────── CTA ───────────── */}
      <section className="border-t border-border py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="accent" className="mb-6">
              {t('ctaNote')}
            </Badge>
            <h2 className="font-display text-display-md text-balance">{t('ctaTitle')}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
              {t('ctaSubtitle')}
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/contact" className={buttonClasses('accent', 'lg')}>
                {tc('getQuote')}
                <ArrowRight size={18} strokeWidth={1.75} />
              </Link>
              <Link href="/work" className={buttonClasses('outline', 'lg')}>
                {tc('viewWork')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
