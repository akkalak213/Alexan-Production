import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { ADMIN_CLIENT_NAMESPACES, PUBLIC_CLIENT_NAMESPACES } from '../src/i18n/client-messages'

/**
 * layout ส่งข้อความให้เบราว์เซอร์เฉพาะกลุ่มที่อยู่ในรายการ
 * ถ้า client component เรียกกลุ่มที่ไม่ได้ส่งไป หน้าเว็บจะขึ้นชื่อคีย์แทนข้อความจริง
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

test('ทุกกลุ่มข้อความที่ client component ใช้ ถูกส่งไปกับหน้าเว็บ', () => {
  const missing: string[] = []

  for (const file of sourceFiles('src')) {
    const source = readFileSync(file, 'utf8')
    if (!/^['"]use client['"]/m.test(source)) continue

    for (const match of source.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]/g)) {
      const namespace = match[1].split('.')[0]
      if (!(PUBLIC_CLIENT_NAMESPACES as readonly string[]).includes(namespace)) {
        missing.push(`${file}: ${namespace}`)
      }
    }

    assert.ok(!/useTranslations\(\s*\)/.test(source), `${file} เรียก useTranslations() โดยไม่ระบุกลุ่ม`)
  }

  assert.deepEqual(missing, [])
})

test('กลุ่มที่ระบุไว้มีอยู่จริงในไฟล์แปลทั้งสองภาษา', () => {
  for (const locale of ['th', 'en']) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, unknown>
    for (const namespace of [...PUBLIC_CLIENT_NAMESPACES, ...ADMIN_CLIENT_NAMESPACES]) {
      assert.ok(namespace in messages, `${locale}.json ไม่มีกลุ่ม ${namespace}`)
    }
  }
})
