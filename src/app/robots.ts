import type { MetadataRoute } from 'next'
import { clientEnv } from '@/lib/env'

const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

/**
 * เส้นทางที่ไม่ควรถูกเก็บ index ไม่ว่าใครจะเป็นคนเก็บ
 *
 * ไม่ปิด /api ทั้งก้อน เพราะ /api/og คือรูปพรีวิวที่ crawler ต้องดึงได้
 * ไม่งั้นการ์ดตอนแชร์ลิงก์ลง LINE หรือ Facebook จะไม่มีรูป
 */
const disallow = ['/admin', '/api/auth', '/api/health']

/**
 * บอตของเครื่องมือค้นหาแบบ AI ที่เปิดให้เข้าอย่างตั้งใจ
 *
 * ต้องประกาศเป็นกลุ่มแยกทีละตัว ไม่ใช่หวังว่ากลุ่ม `*` จะครอบให้
 * เพราะ robots.txt ไม่ได้รวมกฎข้ามกลุ่ม — บอตที่เห็นชื่อตัวเองจะอ่าน "เฉพาะ" กลุ่มของตัวเอง
 * แล้วมองข้ามกลุ่ม `*` ทั้งหมด ถ้าเขียนแค่ Allow: / โดยไม่ใส่ Disallow ซ้ำ
 * บอตพวกนี้จะเดินเข้า /admin ได้ทั้งที่กลุ่ม `*` ปิดไว้แล้ว
 *
 * แบ่งตามสิ่งที่มันทำจริง เพราะผลต่อธุรกิจไม่เหมือนกัน:
 *
 * กลุ่มที่ "ตอบคำถามแล้วอ้างอิงกลับมา" — ตัวที่ทำให้เว็บถูกแนะนำและมีคนกดเข้ามาจริง
 *   OAI-SearchBot, ChatGPT-User  ChatGPT
 *   ClaudeBot, Claude-User, Claude-SearchBot  Claude
 *   PerplexityBot, Perplexity-User  Perplexity
 *   Google-Extended  ใช้ประกอบคำตอบของ Gemini และ AI Overviews
 *   DuckAssistBot, MistralAI-User, Applebot-Extended
 *
 * กลุ่มที่ "เก็บไปฝึกโมเดล" — GPTBot, Amazonbot, meta-externalagent, cohere-ai, Bytespider
 *   ไม่ได้ส่งคนกลับมาโดยตรง แต่เป็นทางที่ชื่อแบรนด์เข้าไปอยู่ในสิ่งที่โมเดลรู้จัก
 *   เปิดไว้เพราะเป้าหมายคืออยากถูกแนะนำ ถ้าวันหนึ่งเปลี่ยนใจ ให้ย้ายชื่อลงมาไว้ในลิสต์ block
 *   ไม่ใช่ลบทิ้ง จะได้เห็นว่าเคยตัดสินใจอะไรไว้
 */
const aiCrawlers = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'DuckAssistBot',
  'MistralAI-User',
  'Applebot',
  'Applebot-Extended',
  'Amazonbot',
  'meta-externalagent',
  'cohere-ai',
  'Bytespider',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      // ทุกตัวได้กฎชุดเดียวกับ `*` แค่ประกาศชื่อไว้ให้ชัดว่าเป็นการเปิดโดยตั้งใจ ไม่ใช่เพราะลืมปิด
      ...aiCrawlers.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
