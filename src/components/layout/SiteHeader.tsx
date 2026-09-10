'use client'

import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { buttonClasses } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { LocaleSwitcher } from './LocaleSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { Wordmark } from './Wordmark'

const navItems = [
  { key: 'services', href: '/services' },
  { key: 'work', href: '/work' },
  { key: 'rental', href: '/rental' },
  { key: 'reviews', href: '/reviews' },
  { key: 'blog', href: '/blog' },
  { key: 'about', href: '/about' },
] as const

export function SiteHeader() {
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const homeRef = useRef<HTMLAnchorElement>(null)
  const openMenu = () => {
    dialogRef.current?.showModal()
    closeRef.current?.focus()
    setIsOpen(true)
  }
  const closeMenu = () => dialogRef.current?.close()
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ล็อกการเลื่อนพื้นหลังตอนเมนูเปิด (การปิดเมนูเมื่อเปลี่ยนหน้าทำที่ onClick ของลิงก์)
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)')
    const closeOnDesktop = () => {
      if (desktop.matches && dialogRef.current?.open) {
        dialogRef.current.close()
        homeRef.current?.focus()
      }
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md transition-shadow duration-300 no-print',
        isScrolled ? 'border-b border-border shadow-soft' : 'border-b border-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-1 sm:gap-4 md:h-20">
        <Link ref={homeRef} href="/" onClick={closeMenu} className="shrink-0" aria-label={t('home')}>
          <Wordmark priority />
        </Link>

        <nav aria-label={t('menu')} className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'relative rounded-md px-3 py-2 text-sm transition-colors',
                    isActive(item.href)
                      ? 'text-foreground'
                      : [
                          'text-muted-foreground hover:text-foreground',
                          // เส้นใต้ลากออกจากซ้ายตอนชี้ ใช้ scaleX จึงไม่ทำให้ layout ขยับ
                          'after:absolute after:inset-x-3 after:-bottom-px after:h-px after:origin-left',
                          'after:scale-x-0 after:bg-accent after:transition-transform after:duration-200',
                          'after:ease-out hover:after:scale-x-100',
                        ],
                  )}
                >
                  {t(item.key)}
                  {isActive(item.href) && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-accent" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LocaleSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle />
          <Link href="/contact" className={buttonClasses('primary', 'sm', 'hidden md:inline-flex')}>
            {tc('getQuote')}
          </Link>

          <button
            type="button"
            onClick={openMenu}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? t('closeMenu') : t('openMenu')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted xl:hidden"
          >
            <Menu size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>

      {/* เมนูมือถือ — เต็มจอ ปุ่มใหญ่พอสำหรับนิ้ว (ขั้นต่ำ 44px) */}
      <dialog
        ref={dialogRef}
        id="mobile-nav"
        aria-label={t('menu')}
        onClose={() => setIsOpen(false)}
        className="mobile-dialog fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto border-0 bg-background p-0 text-foreground"
      >
        <div className="container flex min-h-16 items-center justify-between gap-2 border-b border-border md:min-h-20">
          <span className="font-medium">{t('menu')}</span>
          <button ref={closeRef} type="button" onClick={closeMenu} aria-label={t('closeMenu')} className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted">
            <X size={20} aria-hidden />
          </button>
        </div>
        <nav aria-label={t('menu')} className="container flex flex-col py-4">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={closeMenu}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'flex min-h-[52px] items-center border-b border-border/60 text-lg transition-colors',
                isActive(item.href) ? 'text-accent' : 'text-foreground hover:text-accent',
              )}
            >
              {t(item.key)}
            </Link>
          ))}

          <div className="mt-6 flex flex-col gap-4">
            <Link
              href="/contact"
              onClick={closeMenu}
              className={buttonClasses('primary', 'lg', 'w-full')}
            >
              {tc('getQuote')}
            </Link>
            <LocaleSwitcher className="self-start" />
          </div>
        </nav>
      </dialog>
    </header>
  )
}
