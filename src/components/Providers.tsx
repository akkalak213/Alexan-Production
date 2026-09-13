'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

/**
 * สคริปต์ของ next-themes ต้องรันเฉพาะใน HTML ที่ส่งมาจาก server
 *
 * ตอนเปลี่ยนภาษา layout ทั้งก้อนถูกเรนเดอร์ใหม่ฝั่ง client แล้ว React สร้าง <script> ขึ้นใหม่
 * เบราว์เซอร์ไม่รันสคริปต์ที่ React สร้างอยู่แล้ว (ตอนนั้น ThemeProvider คุมธีมเองได้)
 * แต่ React 19 จะเตือน "Encountered a script tag" ทุกครั้งที่เจอ
 *
 * ฝั่ง client จึงติด type เป็น data block ให้ React รู้ว่าตั้งใจไม่ให้รัน
 * type ที่ต่างกันระหว่าง server กับ client ไม่ทำให้ hydration เตือน
 * เพราะ next-themes ใส่ suppressHydrationWarning ไว้ที่สคริปต์ตัวนี้แล้ว
 */
const scriptProps = typeof window === 'undefined' ? undefined : { type: 'application/json' }

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
      scriptProps={scriptProps}
    >
      {children}
    </ThemeProvider>
  )
}
