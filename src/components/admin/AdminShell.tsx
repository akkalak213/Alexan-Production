'use client'

import {
  Boxes,
  Camera,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  ReceiptText,
  Settings,
  Star,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Wordmark } from '@/components/layout/Wordmark'
import { logout } from '@/server/auth-actions'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number }

const groups: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'งานประจำวัน',
    items: [
      { href: '/admin', label: 'แดชบอร์ด', icon: LayoutDashboard },
      { href: '/admin/leads', label: 'คำขอลูกค้า', icon: Inbox },
      { href: '/admin/reviews', label: 'รีวิว', icon: Star },
      { href: '/admin/quotes', label: 'ใบเสนอราคา', icon: ReceiptText },
    ],
  },
  {
    heading: 'เนื้อหาเว็บไซต์',
    items: [
      { href: '/admin/projects', label: 'ผลงาน', icon: Camera },
      { href: '/admin/services', label: 'บริการ', icon: Boxes },
      { href: '/admin/equipment', label: 'อุปกรณ์เช่า', icon: Camera },
      { href: '/admin/posts', label: 'บทความ', icon: Newspaper },
      { href: '/admin/team', label: 'ทีมงาน', icon: Users },
      { href: '/admin/media', label: 'คลังไฟล์', icon: FileText },
    ],
  },
  {
    heading: 'ตั้งค่า',
    items: [{ href: '/admin/settings', label: 'ข้อมูลบริษัท', icon: Settings }],
  },
]

type Props = {
  children: ReactNode
  user: { name: string; email: string; role: string }
  counts: { leads: number; reviews: number }
}

export function AdminShell({ children, user, counts }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // ล็อกการเลื่อนพื้นหลังตอนเมนูเปิด และคืนค่าเดิมกลับไป ไม่ใช่ล้างทิ้งเป็นค่าว่าง
  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  // ขยายจอจากมือถือเป็นคอมแล้วเมนูค้างเป็นแผ่นทับอยู่ ทั้งที่ sidebar โผล่มาเองแล้ว
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => {
      if (desktop.matches) setIsOpen(false)
    }

    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setIsOpen(false)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const badgeFor = (href: string) =>
    href === '/admin/leads' ? counts.leads : href === '/admin/reviews' ? counts.reviews : 0

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link href="/admin" onClick={() => setIsOpen(false)}>
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="ปิดเมนู"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      <nav aria-label="เมนูหลังบ้าน" className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.heading} className="mb-6">
            <p className="mb-2 px-3 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
              {group.heading}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const badge = badgeFor(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      className={cn(
                        'flex min-h-[40px] items-center gap-3 rounded-md px-3 text-sm transition-colors',
                        isActive(item.href)
                          ? 'bg-accent-subtle font-medium text-accent'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <item.icon size={17} strokeWidth={1.75} aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.7rem] font-medium text-accent-foreground">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-3 py-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-[40px] w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <LogOut size={17} strokeWidth={1.75} aria-hidden />
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface lg:block">
        {sidebar}
      </aside>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-surface lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/90 px-5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="เปิดเมนู"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted lg:hidden"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              ดูหน้าเว็บ
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-5 py-8 md:px-8">{children}</main>
      </div>
    </div>
  )
}
