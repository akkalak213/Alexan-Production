'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('theme')
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={t('toggle')}
      title={t('toggle')}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-md',
        'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {/*
        สลับไอคอนด้วย CSS ตามคลาส .dark บน <html> ไม่ใช่ด้วย state
        ฝั่งเซิร์ฟเวอร์กับ client จึงเรนเดอร์ผลลัพธ์ตรงกันเสมอ ไม่ต้องรอ mount และไม่มีไอคอนกะพริบ
      */}
      <Moon size={17} strokeWidth={1.75} className="dark:hidden" aria-hidden />
      <Sun size={17} strokeWidth={1.75} className="hidden dark:block" aria-hidden />
    </button>
  )
}
