import type { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/site'

/**
 * web app manifest
 *
 * ไม่ได้ทำเพื่อให้เป็น PWA แต่เพื่อให้ Android รู้จักชื่อกับไอคอนตอนลูกค้ากด "เพิ่มลงหน้าจอโฮม"
 * และเพื่อให้เครื่องมือตรวจ SEO เห็นว่าเว็บประกาศตัวตนไว้ครบ ไม่ใช่หน้าเปล่า ๆ ที่ไม่มีแบรนด์
 *
 * ต้องเป็น force-static เพราะไฟล์นี้เป็นค่าคงที่ ไม่ได้อ่านอะไรจากคำขอเลย
 */
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'Alexan',
    description: 'รับทำเว็บไซต์ ถ่ายภาพ ผลิตวิดีโอ และให้เช่าอุปกรณ์ ครบในทีมเดียว',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'th',
    dir: 'ltr',
    background_color: '#0b0b0d',
    theme_color: '#0b0b0d',
    icons: [
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
