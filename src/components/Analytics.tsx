import Script from 'next/script'
import { clientEnv } from '@/lib/env'

/**
 * ไม่ได้ตั้ง NEXT_PUBLIC_GA_ID = ไม่โหลดสคริปต์ใด ๆ เลย ไม่ใช่แค่ซ่อน
 *
 * ทั้งสองแท็กต้องพก nonce ของคำขอนี้ไปด้วย เพราะ CSP ของเว็บเชื่อสคริปต์จาก nonce เท่านั้น
 * ตัวแรกได้ nonce แล้ว gtag.js ที่มันโหลดตามมาจะได้รับความเชื่อต่อผ่าน 'strict-dynamic' เอง
 */
export function Analytics({ nonce }: { nonce?: string }) {
  const gaId = clientEnv.NEXT_PUBLIC_GA_ID
  if (!gaId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga-init" strategy="afterInteractive" nonce={nonce}>
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
      </Script>
    </>
  )
}
