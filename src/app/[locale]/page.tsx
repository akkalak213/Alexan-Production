import { ArrowUpRight, Check, MessageSquare, SlidersHorizontal } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Fragment, type CSSProperties } from 'react'
import { Link } from '@/i18n/navigation'
import type { PriceUnit, ServiceCategory } from '@/generated/prisma/enums'
import type { Locale } from '@/i18n/routing'
import { buttonClasses } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { Faq } from '@/components/ui/Faq'
import { ContentImage } from '@/components/ui/ContentImage'
import { EquipmentIcon } from '@/components/ui/EquipmentIcon'
import { HomeMotion } from '@/components/home/HomeMotion'
import { StudioScene } from '@/components/home/StudioScene'
import { StudioStage } from '@/components/home/StudioStage'
import { ServiceMenu, type ServiceMenuGroup } from '@/components/home/ServiceMenu'
import { CaseStudyViewer } from '@/components/home/CaseStudyViewer'
import { PhotoMosaic, type MosaicPhoto } from '@/components/home/PhotoMosaic'
import { GearRail } from '@/components/home/GearRail'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { getSiteSettings } from '@/lib/settings'
import { equipmentName, formatPrice } from '@/lib/format'
import { safeExternalUrl } from '@/lib/external-link'
import { isPlaceholderImage } from '@/lib/sample-content'
import {
  getApprovedReviews,
  getEquipment,
  getHomeDigitalCase,
  getHomePhotos,
  getHomeServices,
} from '@/server/queries'

/**
 * เรนเดอร์ตอนมีคนขอ ไม่ prerender ตอน build
 * ตอน build บน Railway ยังต่อฐานข้อมูลไม่ได้ หน้าที่ prerender ด้วยข้อมูลเปล่าจะถูกแคชค้างไว้หลัง deploy
 */
export const dynamic = 'force-dynamic'

/**
 * หน้าแรกเล่าเรื่องตามลำดับที่ลูกค้าคิด และของแต่ละชิ้นขึ้นแค่ที่เดียว
 *
 *   เปิดหน้า       เราคือใคร + ฉากสตูดิโอที่ขยับได้ (ฉากนี้มีที่นี่ที่เดียว)
 *   รายการบริการ   ทำอะไรได้บ้าง เริ่มต้นที่เท่าไหร่
 *   เช่า           อุปกรณ์พร้อมราคาต่อวัน และสิ่งที่มีในสตูดิโอ ต่อจากราคาบริการทันที
 *   งานดิจิทัล     หลักฐานฝั่งเว็บ: หน้าจอจริงของงานหนึ่งชิ้น
 *   งานถ่ายภาพ     หลักฐานฝั่งภาพ: ภาพจริงจากงานถ่าย
 *   เริ่มงาน       ขั้นตอนเดียวของทั้งเว็บ ไม่แยกขั้นตอนตามบริการให้ซ้ำกัน
 *
 * ภาพทุกภาพในหน้านี้ไม่ซ้ำกัน รอบก่อนภาพเดียวกันขึ้นสามรอบในหน้าเดียว
 */

const DIGITAL: readonly ServiceCategory[] = ['WEB', 'WEB_APP', 'MOBILE_APP']
const VISUAL: readonly ServiceCategory[] = ['PHOTOGRAPHY', 'VIDEO']

/** โมเสกออกแบบไว้ที่เจ็ดช่อง เต็มพอดีทั้งกริดสองคอลัมน์บนมือถือและสี่คอลัมน์บนคอม */
const MOSAIC_SIZE = 7

const UNIT_KEYS = {
  PROJECT: 'perProject',
  DAY: 'perDay',
  HALF_DAY: 'perHalfDay',
  HOUR: 'perHour',
  MONTH: 'perMonth',
  PERSON: 'perPerson',
} as const satisfies Record<Exclude<PriceUnit, 'CUSTOM'>, string>

/**
 * ภาษาไทยไม่เว้นวรรคระหว่างคำ เบราว์เซอร์จึงตัดบรรทัดได้ทุกขอบคำ
 * หัวเรื่องเคยหักเป็น "เว็บไซต์และงานภาพ ที่ / เล่าเรื่องธุรกิจคุณ"
 * คนเขียนหัวเรื่องเว้นวรรคไว้ตรงจุดแบ่งวลีอยู่แล้ว บนจอกว้างจึงให้ตัดบรรทัดได้เฉพาะตรงช่องว่างนั้น (ดู .phrase ใน CSS)
 * จอแคบยังตัดกลางวลีได้ตามปกติ วลียาวจะได้ไม่ล้นจอ
 */
function Phrases({ text }: { text: string }) {
  const parts = text.split(/\s+/).filter(Boolean)
  return parts.map((part, index) => (
    <Fragment key={index}>
      <span className="phrase">{part}</span>
      {index < parts.length - 1 && ' '}
    </Fragment>
  ))
}

/**
 * หยิบของกระจายให้ทั่วทั้งชุด ไม่ใช่หยิบตัวแรก ๆ ติดกัน
 *
 * ภาพงานถ่ายเรียงตามเวลา ช่วงต้นชุดมักเป็นมุมเดียวกันหลายช็อต เช่นป้ายชื่อบ่าวสาว
 * รอบก่อนหยิบภาพแรก ๆ ติดกัน โมเสกเจ็ดช่องเลยมีป้ายเดียวกันสามภาพ
 */
function spreadOut<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items
  const step = items.length / count
  return Array.from({ length: count }, (_, index) => items[Math.floor(index * step)])
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const [t, tc, tWork, tContact, tCat, tEquip, settings, services, equipment, digitalCase, photoProjects, reviews] =
    await Promise.all([
      getTranslations('home'),
      getTranslations('common'),
      getTranslations('work'),
      getTranslations('contact'),
      getTranslations('serviceCategory'),
      getTranslations('equipmentCategory'),
      getSiteSettings(),
      getHomeServices(),
      getEquipment(),
      getHomeDigitalCase(),
      getHomePhotos(),
      getApprovedReviews(3),
    ])
  const isThai = locale === 'th'
  const unavailableLabel = tc('imageUnavailable')

  // ───── บริการและราคาเริ่มต้น ─────
  type HomeService = (typeof services)[number]
  const priceOf = (service: HomeService) => {
    const pkg = service.packages[0]
    if (!pkg) return undefined
    if (pkg.priceUnit === 'CUSTOM') return { amount: tc('customPrice') }
    const amount = formatPrice(pkg.priceFrom, locale)
    return amount ? { from: tc('startingFrom'), amount, unit: tc(UNIT_KEYS[pkg.priceUnit]) } : { amount: tc('customPrice') }
  }
  const toMenuItem = (service: HomeService) => ({
    id: service.id,
    href: `/services/${service.slug}`,
    icon: service.icon,
    title: isThai ? service.titleTh : service.titleEn,
    tagline: isThai ? service.taglineTh : service.taglineEn,
    price: priceOf(service),
  })
  const menu: ServiceMenuGroup[] = [
    { id: 'digital', label: t('groups.digital'), items: services.filter((s) => DIGITAL.includes(s.category)).map(toMenuItem) },
    { id: 'visual', label: t('groups.visual'), items: services.filter((s) => VISUAL.includes(s.category)).map(toMenuItem) },
  ]
  // บริการสตูดิโอไม่อยู่ในรายการราคา ไปอยู่กับส่วนเช่าที่มันเกี่ยวข้องจริง
  const studioService = services.find((service) => service.category === 'STUDIO')
  const studioPrice = studioService && priceOf(studioService)
  const studioFacts = studioService ? (isThai ? studioService.highlightsTh : studioService.highlightsEn) : []

  // ───── งานดิจิทัล: ภาพหน้าจอจริง ถ้าไม่มีภาพเพิ่มเติมก็ใช้รูปปก ─────
  const rawShots: { id: string; url: string; alt: string | null }[] = !digitalCase
    ? []
    : digitalCase.media.length > 0
      ? digitalCase.media.map(({ id, url, altTh, altEn }) => ({ id, url, alt: isThai ? altTh : altEn }))
      : [{ id: 'cover', url: digitalCase.coverImage, alt: null }]
  const shots = rawShots
    .filter((shot) => !isPlaceholderImage(shot.url))
    .map((shot, index, all) => ({
      id: shot.id,
      url: shot.url,
      label: shot.alt || t('case.shot', { n: index + 1, total: all.length }),
    }))
  const liveUrl = safeExternalUrl(digitalCase?.liveUrl)
  const liveHost = liveUrl ? new URL(liveUrl).hostname.replace(/^www\./, '') : undefined

  // ───── งานถ่ายภาพ: หยิบกระจายทั่วแต่ละชุด แล้วสลับงานละภาพ ภาพติดกันจึงมาจากคนละงาน ─────
  const perProject = Math.ceil(MOSAIC_SIZE / Math.max(photoProjects.length, 1))
  const queues = photoProjects.map((project) => ({
    href: `/work/${project.slug}`,
    title: isThai ? project.titleTh : project.titleEn,
    urls: spreadOut(
      (project.media.length > 0 ? project.media.map((media) => media.url) : [project.coverImage]).filter(
        (url) => !isPlaceholderImage(url),
      ),
      perProject,
    ),
  }))
  const photos: MosaicPhoto[] = []
  for (let round = 0; photos.length < MOSAIC_SIZE && queues.some((queue) => round < queue.urls.length); round++) {
    for (const queue of queues) {
      const url = queue.urls[round]
      if (url && photos.length < MOSAIC_SIZE) photos.push({ key: `${queue.href}-${round}`, url, href: queue.href, title: queue.title })
    }
  }
  const photoSources = [...new Map(photos.map((photo) => [photo.href, photo.title])).entries()]

  // ของที่ไม่ว่างยังดูได้ในหน้าเช่า หน้าแรกโชว์เฉพาะที่เช่าได้ตอนนี้ ราคาที่เห็นจึงจองได้จริง
  const gear = equipment.filter((item) => item.status === 'AVAILABLE')

  const steps = [
    { icon: MessageSquare, title: t('process.step1.title'), text: t('process.step1.text') },
    { icon: SlidersHorizontal, title: t('process.step2.title'), text: t('process.step2.text') },
    { icon: Check, title: t('process.step3.title'), text: t('process.step3.text') },
  ]
  const faq = ([1, 2, 3] as const).map((index) => ({ question: t(`faq.q${index}`), answer: t(`faq.a${index}`) }))

  return (
    <HomeMotion>
      {/* ───────────── เปิดหน้า ───────────── */}
      <section className="home-hero studio-panel" aria-labelledby="home-title">
        <div className="container hero-inner">
          <p className="hero-eyebrow">
            <span aria-hidden />
            Alexan Production · {t('heroLocation')}
          </p>
          <h1 id="home-title" className="hero-title font-display text-balance">
            <Phrases text={isThai ? settings.hero.headlineTh : settings.hero.headlineEn} />
          </h1>
          <p className="hero-description">{t('intro')}</p>
          <div className="hero-actions">
            <Link href="/contact" className={buttonClasses('accent', 'lg')}>
              {tc('getQuote')}
              <ArrowUpRight size={19} aria-hidden />
            </Link>
            <Link href="/work" className={buttonClasses('outline', 'lg')}>
              {tc('viewWork')}
            </Link>
          </div>
          <p className="hero-reassurance">
            <Check size={16} aria-hidden />
            {t('introNote')}
          </p>
        </div>

        <StudioStage pauseLabel={t('motionPause')} playLabel={t('motionPlay')}>
          <StudioScene label={t('studioSceneLabel')} />
        </StudioStage>
      </section>

      {/* ───────────── บริการและราคาเริ่มต้น ───────────── */}
      {menu.some((group) => group.items.length > 0) && (
        <section id="services" aria-labelledby="services-title" className="home-block home-services">
          <div className="container services-layout">
            <div className="services-intro" data-enter>
              <p className="section-eyebrow">{t('servicesEyebrow')}</p>
              <h2 id="services-title" className="home-h2 font-display">
                {t('servicesTitle')}
              </h2>
              <p className="home-lede">{t('servicesSubtitle')}</p>
              <p className="services-note">{t('servicesPriceNote')}</p>
              <Link href="/services" className="text-link">
                {t('servicesAll')}
                <ArrowUpRight size={17} aria-hidden />
              </Link>
            </div>
            <ServiceMenu groups={menu} />
          </div>
        </section>
      )}

      {/* ───────────── สตูดิโอและเช่าอุปกรณ์ ───────────── */}
      <section id="rental" aria-labelledby="rental-title" className="home-block home-rental">
        <div className="container">
          <div className="rental-head" data-enter>
            <div>
              <p className="section-eyebrow">{t('rental.eyebrow')}</p>
              <h2 id="rental-title" className="home-h2 font-display">
                {t('studioHeading')}
              </h2>
            </div>
            <div>
              <p className="home-lede">{t('studioIntro')}</p>
              <div className="rental-actions">
                <Link href="/rental" className={buttonClasses('accent', 'lg')}>
                  {t('studioCta')}
                  <ArrowUpRight size={19} aria-hidden />
                </Link>
                <Link href="/rental/estimate" className={buttonClasses('outline', 'lg')}>
                  {t('rental.estimate')}
                </Link>
              </div>
            </div>
          </div>

          {gear.length > 0 && (
            <div data-enter>
              <GearRail
                label={t('rental.label')}
                countLabel={t('rental.count', { count: gear.length })}
                previousLabel={t('rental.previous')}
                nextLabel={t('rental.next')}
              >
                {gear.map((item) => {
                  const rate = formatPrice(item.dailyRate, locale)
                  return (
                    <li key={item.id}>
                      <Link href={`/rental/${item.slug}`} className="gear-card">
                        <span className="gear-card-image">
                          {item.image && !isPlaceholderImage(item.image) ? (
                            <ContentImage
                              src={item.image}
                              alt=""
                              unavailableLabel={unavailableLabel}
                              fill
                              sizes="(min-width: 1024px) 16rem, (min-width: 640px) 40vw, 72vw"
                              className="object-contain"
                            />
                          ) : (
                            <EquipmentIcon
                              category={item.category}
                              size={40}
                              strokeWidth={1.2}
                              aria-hidden
                              className="gear-card-placeholder"
                            />
                          )}
                        </span>
                        <span className="gear-card-body">
                          <span className="gear-card-category">{tEquip(item.category)}</span>
                          <strong>{equipmentName(item.brand, item.model)}</strong>
                          {rate && (
                            <span className="gear-card-price">
                              <b>{rate}</b> {tc('perDay')}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </GearRail>
            </div>
          )}

          {studioFacts.length > 0 && (
            <div className="rental-studio" data-enter>
              <div className="rental-studio-head">
                <strong>{t('rental.facts')}</strong>
                {studioPrice?.from && (
                  <span>
                    {studioPrice.from} <b>{studioPrice.amount}</b> {studioPrice.unit}
                  </span>
                )}
              </div>
              <ul className="rental-facts">
                {studioFacts.map((fact, index) => (
                  <li key={`${index}-${fact}`}>
                    <Check size={16} aria-hidden />
                    {fact}
                  </li>
                ))}
              </ul>
              {studioService && (
                <Link href={`/services/${studioService.slug}`} className="text-link">
                  {t('studioSpaceAction')}
                  <ArrowUpRight size={16} aria-hidden />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ───────────── งานดิจิทัล ───────────── */}
      {digitalCase && shots.length > 0 && (
        <section id="digital-work" aria-labelledby="case-title" className="home-block home-case">
          <div className="container case-layout">
            <div className="case-visual" data-enter>
              <CaseStudyViewer
                shots={shots}
                host={liveHost}
                listLabel={t('case.shots')}
                unavailableLabel={unavailableLabel}
              />
            </div>
            <div className="case-copy" data-enter style={{ '--entry-delay': '120ms' } as CSSProperties}>
              <p className="section-eyebrow">{t('case.eyebrow')}</p>
              <h2 id="case-title" className="home-h2 case-title font-display">
                {isThai ? digitalCase.titleTh : digitalCase.titleEn}
              </h2>
              <p className="case-meta">
                <span>{tCat(digitalCase.category)}</span>
                {digitalCase.year && <span>{digitalCase.year}</span>}
                {digitalCase.clientName && <span>{digitalCase.clientName}</span>}
              </p>
              <p className="home-lede case-summary">{isThai ? digitalCase.summaryTh : digitalCase.summaryEn}</p>
              {digitalCase.techStack.length > 0 && (
                <div className="case-tech">
                  <p>{tWork('techStack')}</p>
                  <ul>
                    {digitalCase.techStack.slice(0, 8).map((tech, index) => (
                      <li key={`${index}-${tech}`}>{tech}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="case-actions">
                <Link href={`/work/${digitalCase.slug}`} className={buttonClasses('outline', 'lg')}>
                  {t('case.details')}
                  <ArrowUpRight size={18} aria-hidden />
                </Link>
                {liveUrl && (
                  <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                    {tWork('visitSite')}
                    <ArrowUpRight size={17} aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────── งานถ่ายภาพ ───────────── */}
      {photos.length >= 3 && (
        <section id="photography" aria-labelledby="photos-title" className="home-block home-photos studio-panel">
          <div className="container">
            <div className="photos-head" data-enter>
              <div>
                <p className="section-eyebrow">{t('photos.eyebrow')}</p>
                <h2 id="photos-title" className="home-h2 font-display">
                  {t('photos.title')}
                </h2>
              </div>
              <p className="home-lede">{t('photos.subtitle')}</p>
            </div>
            <PhotoMosaic photos={photos} unavailableLabel={unavailableLabel} />
            <div className="photos-foot">
              <p>
                {t('photos.from')}
                {photoSources.map(([href, title]) => (
                  <Link key={href} href={href}>
                    {title}
                    <ArrowUpRight size={15} aria-hidden />
                  </Link>
                ))}
              </p>
              <Link href={{ pathname: '/work', query: { category: 'PHOTOGRAPHY' } }} className="text-link">
                {t('photos.all')}
                <ArrowUpRight size={17} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────────── เริ่มงานกับเรา + คำถามที่พบบ่อย ───────────── */}
      <section id="how-it-works" aria-labelledby="start-title" className="home-block home-start">
        <div className="container">
          <div className="start-head" data-enter>
            <p className="section-eyebrow">{t('process.eyebrow')}</p>
            <h2 id="start-title" className="home-h2 font-display">
              {t('process.title')}
            </h2>
            <p className="home-lede">{t('process.description')}</p>
          </div>
          <ol className="start-steps">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <li
                key={title}
                className="start-step"
                data-enter
                style={{ '--entry-delay': `${index * 100}ms` } as CSSProperties}
              >
                <div className="start-step-top">
                  <span className="start-step-number font-display" aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon size={20} strokeWidth={1.6} aria-hidden />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className="start-faq" data-enter>
            <div>
              <p className="section-eyebrow">{t('faq.eyebrow')}</p>
              <h3 className="start-faq-title font-display text-balance">{t('faq.title')}</h3>
              <Link href="/contact" className="text-link">
                {t('faq.action')}
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            </div>
            <Faq items={faq} />
          </div>
        </div>
      </section>

      {/* ───────────── เสียงจากลูกค้า ───────────── */}
      {reviews.length > 0 && (
        <Section
          className="home-section"
          eyebrow={t('reviewsEyebrow')}
          title={t('reviewsTitle')}
          subtitle={t('reviewsSubtitle')}
          action={
            <Link href="/reviews" className="text-link">
              {t('reviewsCta')}
              <ArrowUpRight size={17} aria-hidden />
            </Link>
          }
        >
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <li key={review.id} data-enter style={{ '--entry-delay': `${index * 90}ms` } as CSSProperties}>
                <ReviewCard review={review} locale={locale} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ───────────── ชวนคุย ───────────── */}
      <section aria-labelledby="contact-title" className="home-contact">
        <div className="container">
          <div className="contact-band" data-enter>
            <div>
              <p className="section-eyebrow">{t('ctaNote')}</p>
              <h2 id="contact-title" className="font-display text-balance">
                {t('ctaTitle')}
              </h2>
              <p>{t('ctaSubtitle')}</p>
            </div>
            <div className="contact-band-action">
              <Link href="/contact" className={buttonClasses('primary', 'lg')}>
                {tc('getQuote')}
                <ArrowUpRight size={19} aria-hidden />
              </Link>
              <small>{tContact('responseNote')}</small>
            </div>
          </div>
        </div>
      </section>
    </HomeMotion>
  )
}
