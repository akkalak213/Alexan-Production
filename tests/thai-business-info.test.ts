import assert from 'node:assert/strict'
import test from 'node:test'
import { parseOpeningHours, parseThaiAddress } from '../src/lib/thai-business-info'

/**
 * ค่าสองตัวนี้ไปอยู่ใน JSON-LD ที่ Google อ่านเพื่อตัดสินว่ากิจการนี้อยู่ที่ไหนและเปิดเมื่อไหร่
 * แกะผิดแล้วผลเสียไม่เท่ากัน: ที่อยู่ผิดทำให้ค้นเจอยากขึ้น แต่เวลาทำการผิดทำให้ลูกค้ามาเก้อ
 * ทั้งสองฟังก์ชันจึงต้อง "ไม่เดา" — แกะไม่ออกต้องคืนค่าว่าง ไม่ใช่เดาให้ใกล้เคียง
 */

test('แกะที่อยู่ต่างจังหวัดแบบเต็มรูป', () => {
  const parsed = parseThaiAddress(
    '35 หมู่ 9 ตำบลปากแพรก อำเภอปากพนัง จังหวัดนครศรีธรรมราช 80140',
  )

  assert.equal(parsed.streetAddress, '35 หมู่ 9')
  assert.equal(parsed.addressLocality, 'ปากพนัง')
  assert.equal(parsed.addressRegion, 'นครศรีธรรมราช')
  assert.equal(parsed.postalCode, '80140')
})

test('แกะที่อยู่แบบย่อ ต. อ. จ.', () => {
  const parsed = parseThaiAddress('99/1 ถนนราชดำเนิน ต.ในเมือง อ.เมือง จ.นครศรีธรรมราช 80000')

  assert.equal(parsed.addressLocality, 'เมือง')
  assert.equal(parsed.addressRegion, 'นครศรีธรรมราช')
  assert.equal(parsed.postalCode, '80000')
})

test('กรุงเทพฯ ใช้แขวง/เขต และไม่มีคำว่าจังหวัด', () => {
  const parsed = parseThaiAddress('123 ซอยสุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110')

  assert.equal(parsed.addressLocality, 'วัฒนา')
  assert.equal(parsed.addressRegion, 'กรุงเทพมหานคร')
  assert.equal(parsed.postalCode, '10110')
})

test('ที่อยู่ที่แกะไม่ออกต้องไม่แย่กว่าเดิม — ข้อความเต็มยังอยู่ครบ', () => {
  const raw = 'ติดต่อผ่านออนไลน์เท่านั้น'
  const parsed = parseThaiAddress(raw)

  assert.equal(parsed.streetAddress, raw)
  assert.equal(parsed.addressLocality, '')
  assert.equal(parsed.addressRegion, '')
  assert.equal(parsed.postalCode, '')
})

test('ไม่มีที่อยู่ก็ไม่พัง', () => {
  for (const value of [null, undefined, '', '   ']) {
    assert.deepEqual(parseThaiAddress(value), {
      streetAddress: '',
      addressLocality: '',
      addressRegion: '',
      postalCode: '',
    })
  }
})

// ─────────────────── เวลาทำการ ───────────────────

test('เปิดทุกวันแปลงเป็นเจ็ดวันในรูปแบบของ schema.org', () => {
  const parsed = parseOpeningHours('เปิดทุกวัน 09.00 – 22.00 น.')

  assert.equal(parsed?.opens, '09:00')
  assert.equal(parsed?.closes, '22:00')
  assert.equal(parsed?.dayOfWeek.length, 7)
})

test('จันทร์ถึงศุกร์ได้ห้าวัน ไม่ใช่เจ็ด', () => {
  for (const text of ['จันทร์-ศุกร์ 9:00-18:00', 'Mon-Fri 09:00-18:00']) {
    const parsed = parseOpeningHours(text)
    assert.deepEqual(parsed?.dayOfWeek.length, 5, text)
    assert.equal(parsed?.opens, '09:00', text)
    assert.equal(parsed?.closes, '18:00', text)
  }
})

test('มีเวลาแต่ไม่บอกวัน ต้องไม่เดาว่าเปิดทุกวัน', () => {
  // ลูกค้าที่มาวันอาทิตย์แล้วเจอร้านปิดคือลูกค้าที่เสียไปเลย
  assert.equal(parseOpeningHours('09:00-18:00'), null)
  assert.equal(parseOpeningHours('เปิด 10.00 น. เป็นต้นไป'), null)
})

test('ประโยคที่ซับซ้อนเกินกว่าจะมั่นใจ ให้คืน null', () => {
  for (const value of [null, undefined, '', 'ตามนัดหมาย', 'ปิดปรับปรุง']) {
    assert.equal(parseOpeningHours(value), null, String(value))
  }
})

test('เวลาปิดที่มาก่อนเวลาเปิดคือค่าที่กรอกผิด ไม่ใช่ร้านเปิดข้ามคืน', () => {
  assert.equal(parseOpeningHours('ทุกวัน 22:00-09:00'), null)
})
