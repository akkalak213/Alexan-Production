import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

/**
 * ตรวจคู่สีจาก token จริงใน globals.css ตามช่อง Light + Dark ของ acceptance matrix
 * ใน docs/design/design-handoff.md — ข้อความปกติ 4.5:1 และขอบ control ที่จำเป็น 3:1
 *
 * ตรวจที่ค่า token ไม่ใช่ที่หน้าจอ จึงไม่ครอบ gradient, opacity modifier, ภาพพื้นหลัง
 * หรือสถานะ hover/selected — ของพวกนั้นยังต้องดูด้วยตาในเบราว์เซอร์
 * ที่ทำได้ตรงนี้คือกันไม่ให้ค่าฐานถอยกลับไปต่ำกว่าเกณฑ์โดยไม่มีใครรู้
 */

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8')

function tokensOf(selector: string): Record<string, [number, number, number]> {
  const start = css.indexOf(`${selector} {`)
  assert.notEqual(start, -1, `หา block ${selector} ใน globals.css ไม่เจอ`)

  const block = css.slice(start, css.indexOf('\n  }', start))
  const tokens: Record<string, [number, number, number]> = {}

  for (const match of block.matchAll(/--([a-z-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)) {
    tokens[match[1]] = [Number(match[2]), Number(match[3]), Number(match[4])]
  }
  return tokens
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  s /= 100
  l /= 100
  if (s === 0) return [l, l, l]

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)]
}

/** relative luminance ตามนิยาม sRGB ของ WCAG */
function luminance([h, s, l]: [number, number, number]) {
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = hslToRgb(h, s, l).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [first, second] = [luminance(a), luminance(b)]
  const [lighter, darker] = first > second ? [first, second] : [second, first]
  return (lighter + 0.05) / (darker + 0.05)
}

/** ข้อความปกติ — เกณฑ์ 4.5:1 */
const textPairs: [string, string][] = [
  ['foreground', 'background'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'surface'],
  ['accent', 'background'],
  ['accent', 'surface'],
  ['accent', 'subtle'],
  ['accent-foreground', 'accent'],
  ['primary-foreground', 'primary'],
]

/** ขอบและพื้นของ control ที่ต้องแยกออกจากพื้นหลัง — เกณฑ์ 3:1 */
const boundaryPairs: [string, string][] = [
  ['input', 'surface'],
  ['input', 'background'],
]

for (const selector of [':root', '.dark']) {
  const themeName = selector === ':root' ? 'ธีมสว่าง' : 'ธีมมืด'

  test(`${themeName}: ข้อความปกติผ่าน 4.5:1 ทุกคู่`, () => {
    const tokens = tokensOf(selector)

    for (const [foreground, background] of textPairs) {
      const ratio = contrast(tokens[foreground], tokens[background])
      assert.ok(
        ratio >= 4.5,
        `${selector} ${foreground}/${background} ได้ ${ratio.toFixed(2)}:1 ต่ำกว่าเกณฑ์ 4.5:1`,
      )
    }
  })

  test(`${themeName}: ขอบช่องกรอกแยกจากพื้นได้ที่ 3:1`, () => {
    const tokens = tokensOf(selector)

    for (const [foreground, background] of boundaryPairs) {
      const ratio = contrast(tokens[foreground], tokens[background])
      assert.ok(
        ratio >= 3,
        `${selector} ${foreground}/${background} ได้ ${ratio.toFixed(2)}:1 ต่ำกว่าเกณฑ์ 3:1`,
      )
    }
  })
}

test('สีแจ้งสถานะอ่านออกบนพื้นของตัวเอง', () => {
  for (const selector of [':root', '.dark']) {
    const tokens = tokensOf(selector)

    for (const state of ['destructive', 'success']) {
      for (const background of ['background', 'surface']) {
        const ratio = contrast(tokens[state], tokens[background])
        assert.ok(
          ratio >= 4.5,
          `${selector} ${state}/${background} ได้ ${ratio.toFixed(2)}:1 ต่ำกว่าเกณฑ์ 4.5:1`,
        )
      }
    }
  }
})
