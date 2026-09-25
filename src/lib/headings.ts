import { Children, isValidElement, type ReactNode } from 'react'

/**
 * id ของหัวข้อในบทความ ใช้ทั้งตอนสร้างสารบัญจาก Markdown และตอนแสดงหัวข้อจริง
 * สองฝั่งต้องได้ค่าเดียวกัน ลิงก์ในสารบัญจึงพาไปถูกที่
 * เก็บตัวอักษรทุกภาษา (รวมสระและวรรณยุกต์ไทย) และตัวเลข ที่เหลือแทนด้วยขีด
 */
export function headingId(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug ? `h-${slug}` : 'h-section'
}

/** ตัดเครื่องหมาย Markdown ในบรรทัดหัวข้อออก ให้เหลือข้อความเดียวกับที่ผู้อ่านเห็น */
function plainHeading(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
}

/** หัวข้อระดับสอง (## ) ทั้งหมดในบทความ ตามลำดับ ข้ามบรรทัดที่อยู่ในบล็อกโค้ด */
export function markdownHeadings(markdown: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = []
  let inFence = false
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (inFence) continue
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line)
    if (match) {
      const text = plainHeading(match[1])
      if (text) headings.push({ id: headingId(text), text })
    }
  }
  return headings
}

/** ข้อความล้วนจาก children ของ React ใช้หา id ของหัวข้อที่ react-markdown เรนเดอร์มา */
export function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (isValidElement<{ children?: ReactNode }>(child)) return textOf(child.props.children)
      return ''
    })
    .join('')
}
