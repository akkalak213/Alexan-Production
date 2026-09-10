import { ArrowRight, Camera, Code2, Handshake, Layers, PackageOpen, Receipt } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { localizedPath, type Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'
import { buttonClasses } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { getSiteSettings } from '@/lib/settings'
import { getTeamMembers } from '@/server/queries'
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

  const [t, tc, tNav, team, settings] = await Promise.all([
    getTranslations('about'),
    getTranslations('common'),
    getTranslations('nav'),
    getTeamMembers(),
    getSiteSettings(),
  ])
  const isThai = locale === 'th'

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
      <section className="border-b border-border py-16 md:py-24">
        <div className="container">
          <div className="stage max-w-3xl">
            <p className="rule-draw mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">
              {t('eyebrow')}
            </p>
            <h1 className="font-display text-display-lg text-balance">{t('title')}</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* ───────────── จุดเริ่มต้น ───────────── */}
      <Section title={t('storyTitle')}>
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
          {[t('storyParagraph1'), t('storyParagraph2'), t('storyParagraph3')].map((p, i) => (
            <p key={i} className="leading-relaxed text-muted-foreground text-pretty md:text-lg">
              {p}
            </p>
          ))}
        </div>
      </Section>

      {/* ───────────── สิ่งที่เราทำ ───────────── */}
      <Section tone="subtle" title={t('whatTitle')} subtitle={t('whatSubtitle')}>
        <ul className="reveal-stagger grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {doing.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-background p-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent-subtle text-accent">
                <Icon size={20} strokeWidth={1.6} aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-2xl text-balance">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
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
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
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
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
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
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
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
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {isThai ? member.bioTh : member.bioEn}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ───────────── ชวนคุยงาน ───────────── */}
      <section className="border-t border-border py-16 md:py-20">
        <div className="container flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-display-md text-balance">{t('contactCta')}</h2>
          <Link href="/contact" className={buttonClasses('accent', 'lg', 'shrink-0')}>
            {tc('getQuote')}
            <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  )
}
