'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

/**
 * next-themes แทรกสคริปต์เล็ก ๆ ไว้ต้นหน้าเพื่ออ่านธีมที่ผู้ใช้เลือกไว้ก่อนเบราว์เซอร์วาดครั้งแรก
 * ถ้าสคริปต์ตัวนี้ไม่มี nonce จะโดน CSP บล็อก แล้วหน้าจะแวบเป็นธีมสว่างก่อนสลับกลับเป็นมืด
 */
export function Providers({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </ThemeProvider>
  )
}
