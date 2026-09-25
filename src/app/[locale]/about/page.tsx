import { ArrowRight, ArrowUpRight, Camera, Code2, Handshake, Layers, PackageOpen, Receipt } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { buttonClasses } from '@/components/ui/Button'
import { ContactBand } from '@/components/ui/ContactBand'
import { ContentImage } from '@/components/ui/ContentImage'
import { Section } from '@/components/ui/Section'
import { equipmentName, formatNumber } from '@/lib/format'
import { isPlaceholderImage } from '@/lib/sample-content'
import { getSiteSettings } from '@/lib/settings'
import {
  getActiveServices,
  getEquipment,
  getHomePhotos,
  getPublicProjectCount,
  getReviewStats,
  getTeamMembers,
} from '@/server/queries'
import { JsonLd } from '@/components/JsonLd'
import {
  breadcrumbSchema,
  organizationRef,
  personSchema,
  webPageSchema,
} from '@/lib/structured-data'

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
  const t = await getTranslations({ locale, namespace: 'about' })

  return pageMetadata({
    locale,
    path: '/about',
    title: t('metaTitle'),
    description: t('metaDescription'),
  })
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, tc, tNav, tHome, tContact, team, settings, photoProjects, projectCount, reviewStats, services, equipment] =
    await Promise.all([
      getTranslations('about'),
      getTranslations('common'),
      getTranslations('nav'),
      getTranslations('home'),
      getTranslations('contact'),
      getTeamMembers(),
      getSiteSettings(),
      getHomePhotos(),
      getPublicProjectCount(),
      getReviewStats(),
      getActiveServices(),
      getEquipment(),
    ])
  const isThai = locale === 'th'

  /*
   * ภาพประกอบหัวหน้ามาจากงานถ่ายจริงของทีม ไม่ใช่ภาพสต็อก
   * ใช้สองงานที่มีภาพมากที่สุด งานที่มีภาพไม่กี่ใบมักเป็นภาพจัดเลย์เอาต์มีตัวหนังสือ ครอปเป็นภาพประกอบแล้วดูไม่ออก
   * สลับหยิบทีละงาน ภาพที่วางติดกันจึงมาจากคนละงาน และหยิบจากกลางชุดซึ่งมักเป็นภาพคน ไม่ใช่ป้ายชื่องาน
   */
  const shoots = [...photoProjects].sort((a, b) => b.media.length - a.media.length).slice(0, 2)
  const photoQueues = shoots.map((project) => {
    const urls = (project.media.length > 0 ? project.media.map((media) => media.url) : [project.coverImage]).filter(
      (url) => !isPlaceholderImage(url),
    )
    return [0.35, 0.7, 0.15].map((at) => urls[Math.floor(urls.length * at)]).filter(Boolean)
  })
  const collage: string[] = []
  for (let round = 0; round < 3 && collage.length < 3; round++) {
    for (const queue of photoQueues) {
      const url = queue[round]
      if (url && !collage.includes(url) && collage.length < 3) collage.push(url)
    }
  }

  // ของในสตูดิโอที่มีรูป สี่ชิ้นแรกตามลำดับที่ตั้งไว้ในหลังบ้าน
  const studioGear = equipment
    .filter((item): item is typeof item & { image: string } => item.image !== null && !isPlaceholderImage(item.image))
    .slice(0, 4)

  const doing = [
    { icon: Code2, title: t('whatDigitalTitle'), body: t('whatDigitalBody') },
    { icon: Camera, title: t('whatVisualTitle'), body: t('whatVisualBody') },
    { icon: Layers, title: t('whatBothTitle'), body: t('whatBothBody') },
  ]

  const steps = [1, 2, 3, 4, 5].map((n) => ({
    n,
    title: t(`process${n}Title` as 'process1Title'),
    body: t(`process${n}Body` as 'process1Body'),
  }))

  const clients = [1, 2, 3, 4].map((n) => ({
    title: t(`client${n}Title` as 'client1Title'),
    body: t(`client${n}Body` as 'client1Body'),
  }))

  const values = [
    { icon: Receipt, title: t('value1Title'), body: t('value1Body') },
    { icon: PackageOpen, title: t('value2Title'), body: t('value2Body') },
    { icon: Handshake, title: t('value3Title'), body: t('value3Body') },
  ]

  return (
    <>
      {/*
        หน้าเกี่ยวกับเราเป็นหน้าที่เครื่องมือค้นหาใช้ตัดสินว่าเบื้องหลังเว็บนี้มีคนจริงหรือเปล่า
        ประกาศทีมเป็น Person ที่ผูกกับกิจการ ทำให้คำตอบของ AI อ้างถึงคนได้ ไม่ใช่แค่ชื่อบริษัทลอย ๆ
      */}
      <JsonLd
        data={{
          ...webPageSchema({
            type: 'AboutPage',
            name: t('title'),
            description: t('subtitle'),
            path: '/about',
            locale,
          }),
          ...(team.length
            ? {
                // ชี้กลับไปที่กิจการเดียวกับที่ layout ประกาศไว้ ไม่ประกาศข้อมูลบริษัทซ้ำ
                mainEntity: {
                  ...organizationRef,
                  employee: team.map((member) =>
                    personSchema({
                      name: member.name,
                      role: isThai ? member.roleTh : member.roleEn,
                      bio: isThai ? member.bioTh : member.bioEn,
                      photo: member.photo,
                    }),
                  ),
                },
              }
            : {}),
        }}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav('home'), path: localizedPath(locale) },
          { name: tNav('about'), path: localizedPath(locale, '/about') },
        ])}
      />

      {/* ───────────── หัวเรื่อง พร้อมตัวเลขที่บอกขนาดของทีม ───────────── */}
      <section className="about-hero border-b border-border">
        <div className="container about-hero-grid">
          <div className="stage">
            <p className="section-eyebrow">{t('eyebrow')}</p>
            <h1 className="mt-4 font-display text-display-lg text-balance">{t('title')}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
              {t('subtitle')}
            </p>

            {/* ตัวเลขจริงจากฐานข้อมูล ไม่มีข้อมูลก็ไม่แสดงช่องนั้น ไม่ใส่ตัวเลขลอย ๆ */}
            <dl className="about-stats">
              {projectCount > 0 && (
                <div>
                  <dt>{t('statWork')}</dt>
                  <dd className="tabular font-display">{formatNumber(projectCount, locale)}</dd>
                </div>
              )}
              {reviewStats.total > 0 && (
                <div>
                  <dt>{t('statRating')}</dt>
                  <dd className="tabular font-display">
                    {reviewStats.average.toFixed(1)}
                    <small>/5</small>
                  </dd>
                </div>
              )}
              {services.length > 0 && (
                <div>
                  <dt>{t('statServices')}</dt>
                  <dd className="tabular font-display">{formatNumber(services.length, locale)}</dd>
                </div>
              )}
            </dl>
          </div>

          {collage.length === 3 && (
            <div className="about-collage" role="img" aria-label={t('collageLabel')}>
              {collage.map((url) => (
                <span key={url}>
                  <ContentImage
                    src={url}
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1024px) 24vw, 40vw"
                    className="object-cover"
                    unavailableLabel={tc('imageUnavailable')}
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────────── จุดเริ่มต้น: หัวข้อซ้าย เรื่องเล่าขวา ย่อหน้าแรกเป็นบทนำตัวใหญ่ ───────────── */}
      <section className="py-20 md:py-28">
        <div className="container about-story">
          <h2 className="font-display text-display-sm text-balance">{t('storyTitle')}</h2>
          <div>
            {[t('storyParagraph1'), t('storyParagraph2'), t('storyParagraph3')].map((p, i) => (
              <p key={i} className="text-pretty">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── สิ่งที่เราทำ ───────────── */}
      <Section tone="subtle" title={t('whatTitle')} subtitle={t('whatSubtitle')}>
        <ul className="reveal-stagger grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {doing.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-background p-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent-subtle text-accent">
                <Icon size={20} strokeWidth={1.6} aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-2xl text-balance">{title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───────────── วิธีทำงาน ───────────── */}
      <Section title={t('processTitle')} subtitle={t('processSubtitle')}>
        <ol className="reveal-stagger grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(({ n, title, body }) => (
            <li key={n} className="border-t-2 border-accent/30 pt-5">
              <span className="tabular font-display text-3xl text-accent">
                {String(n).padStart(2, '0')}
              </span>
              <h3 className="mt-2 font-medium">{title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ───────────── เราทำงานกับใคร ───────────── */}
      <Section tone="subtle" title={t('clientsTitle')} subtitle={t('clientsSubtitle')}>
        <ul className="reveal-stagger grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {clients.map(({ title, body }) => (
            <li key={title} className="bg-background p-7">
              <h3 className="font-display text-xl text-balance">{title}</h3>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───────────── สิ่งที่เรายึดถือ ───────────── */}
      <Section title={t('valuesTitle')}>
        <ul className="reveal-stagger grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {values.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-background p-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent-subtle text-accent">
                <Icon size={20} strokeWidth={1.6} aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-2xl text-balance">{title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───────────── สตูดิโอ ───────────── */}
      <Section tone="subtle" title={t('studioTitle')}>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <p className="leading-relaxed text-muted-foreground text-pretty md:text-lg">
            {t('studioBody')}
          </p>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="text-pretty">{isThai ? settings.company.addressTh : settings.company.addressEn}</p>
            <p>{isThai ? settings.company.openingHoursTh : settings.company.openingHoursEn}</p>
            <Link href="/rental" className={buttonClasses('outline', 'md', 'mt-2')}>
              {t('studioCta')}
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
        </div>

        {studioGear.length > 0 && (
          <div className="mt-12">
            <p className="mb-4 text-[0.9375rem] font-medium">{t('studioGear')}</p>
            <ul className="about-gear">
              {studioGear.map((item) => (
                <li key={item.id}>
                  <Link href={`/rental/${item.slug}`} className="group">
                    <span className="product-tile relative block aspect-square overflow-hidden rounded-xl border border-border">
                      <ContentImage
                        src={item.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 18vw, 45vw"
                        className="object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-105"
                        unavailableLabel={tc('imageUnavailable')}
                      />
                    </span>
                    <span className="mt-2.5 flex items-center justify-between gap-2 text-[0.875rem] font-medium">
                      <span className="truncate">{equipmentName(item.brand, item.model)}</span>
                      <ArrowUpRight size={15} aria-hidden className="shrink-0 text-muted-foreground transition-colors group-hover:text-accent" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* ───────────── ทีม แสดงเมื่อมีข้อมูลเท่านั้น ───────────── */}
      {team.length > 0 && (
        <Section title={t('teamTitle')} subtitle={t('teamSubtitle')}>
          <ul className="reveal-stagger grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member) => (
              <li key={member.id}>
                {member.photo && (
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-subtle">
                    <Image
                      src={member.photo}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <h3 className="mt-5 font-display text-2xl">{member.name}</h3>
                <p className="mt-1 text-sm text-accent">{isThai ? member.roleTh : member.roleEn}</p>
                {(isThai ? member.bioTh : member.bioEn) && (
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">
                    {isThai ? member.bioTh : member.bioEn}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ───────────── ชวนคุยงาน ───────────── */}
      <ContactBand
        eyebrow={tHome('ctaNote')}
        title={t('contactCta')}
        subtitle={tHome('ctaSubtitle')}
        actionLabel={tc('getQuote')}
        note={tContact('responseNote')}
      />
    </>
  )
}
