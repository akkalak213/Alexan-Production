import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/admin/LoginForm'
import { Wordmark } from '@/components/layout/Wordmark'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ' }

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Wordmark priority />
          <p className="mt-3 text-sm text-muted-foreground">ระบบจัดการเนื้อหาเว็บไซต์</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-7">
          {/* useSearchParams ต้องอยู่ใต้ Suspense ไม่งั้นทั้งหน้าจะกลายเป็น dynamic */}
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          หน้านี้สำหรับทีมงานเท่านั้น
        </p>
      </div>
    </main>
  )
}
