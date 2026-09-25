import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { headingId, markdownHeadings, textOf } from '../src/lib/headings'
import { startingPrice } from '../src/lib/service-pricing'

test('สารบัญได้หัวข้อระดับสองตามลำดับ ข้ามหัวข้อย่อยและบรรทัดในบล็อกโค้ด', () => {
  const markdown = [
    'ย่อหน้าเปิด',
    '## 1. Template สำเร็จรูป vs. **Custom** Design',
    '### หัวข้อย่อยไม่ขึ้นสารบัญ',
    '```md',
    '## บรรทัดนี้อยู่ในโค้ด',
    '```',
    '## ดู [ราคา](https://example.com) ##',
  ].join('\n')

  assert.deepEqual(
    markdownHeadings(markdown).map((heading) => heading.text),
    ['1. Template สำเร็จรูป vs. Custom Design', 'ดู ราคา'],
  )
})

test('id ของหัวข้อตรงกันทั้งฝั่งสารบัญและฝั่งที่ react-markdown เรนเดอร์', () => {
  const [fromMarkdown] = markdownHeadings('## 3. โครงสร้างพื้นฐาน (Infrastructure & Security)')
  // react-markdown ส่ง children มาเป็นข้อความผสมองค์ประกอบ เช่นตัวหนา
  const rendered = ['3. โครงสร้างพื้นฐาน (', createElement('strong', null, 'Infrastructure'), ' & Security)']

  assert.equal(fromMarkdown.id, headingId(textOf(rendered)))
  // สระและวรรณยุกต์ไทยต้องอยู่ครบ ไม่งั้นหัวข้อที่ต่างกันแค่วรรณยุกต์จะได้ id เดียวกัน
  assert.equal(headingId('ไก่ ไข่'), 'h-ไก่-ไข่')
  assert.equal(headingId('!!!'), 'h-section')
})

test('ราคาเริ่มต้นของบริการแสดงเป็นข้อความเมื่อไม่มีตัวเลขหรือเป็นราคาประเมิน', () => {
  const t = (key: string) => `[${key}]`
  assert.equal(startingPrice(undefined, 'th', t), undefined)
  assert.deepEqual(startingPrice({ priceFrom: null, priceUnit: 'CUSTOM' }, 'th', t), { amount: '[customPrice]' })
  assert.deepEqual(startingPrice({ priceFrom: null, priceUnit: 'PROJECT' }, 'th', t), { amount: '[customPrice]' })

  const price = startingPrice({ priceFrom: 12000, priceUnit: 'PROJECT' }, 'th', t)
  assert.equal(price?.from, '[startingFrom]')
  assert.equal(price?.unit, '[perProject]')
  assert.match(price?.amount ?? '', /12,000/)
})
