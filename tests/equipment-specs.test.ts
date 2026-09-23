import assert from 'node:assert/strict'
import test from 'node:test'
import { localizeSpecs, readSpecRows, specsFromForm } from '../src/lib/equipment-specs'
import { rentalQuoteTerms } from '../src/lib/rental-quote'

test('ข้อมูลเก่าที่มีแค่ label/value ยังอ่านได้ และหน้าไทยแสดงตามเดิม', () => {
  const stored = [
    { label: 'รูรับแสง', value: 'F1.8' },
    { label: 'ไม่มีค่า', value: '' },
    'ขยะ',
    null,
  ]
  assert.deepEqual(localizeSpecs(stored, 'th'), [{ label: 'รูรับแสง', value: 'F1.8' }])
  assert.deepEqual(readSpecRows(stored), [{ label: 'รูรับแสง', value: 'F1.8', labelEn: '', valueEn: '' }])
  assert.deepEqual(localizeSpecs('ไม่ใช่อาเรย์', 'th'), [])
})

test('หน้าอังกฤษใช้ที่แอดมินกรอกก่อน แล้วค่อยแปลหัวข้อที่รู้จัก และไม่แปลค่าเอง', () => {
  const stored = [
    { label: 'รูรับแสง', value: 'F3.5–5.6 (แปรตามช่วงซูม)', labelEn: 'Max aperture', valueEn: 'F3.5–5.6 (varies with zoom)' },
    { label: 'เมาท์', value: 'L-Mount' },
    { label: 'หัวข้อแปลก', value: '42' },
  ]
  assert.deepEqual(localizeSpecs(stored, 'en'), [
    { label: 'Max aperture', value: 'F3.5–5.6 (varies with zoom)' },
    { label: 'Mount', value: 'L-Mount' },
    { label: 'หัวข้อแปลก', value: '42' },
  ])
})

test('ฟอร์มหลังบ้านเก็บภาษาอังกฤษเฉพาะที่กรอก และแถวที่กรอกแต่อังกฤษไม่หาย', () => {
  const form = new FormData()
  const row = (label: string, value: string, labelEn: string, valueEn: string) => {
    form.append('specsLabel', label)
    form.append('specsValue', value)
    form.append('specsLabelEn', labelEn)
    form.append('specsValueEn', valueEn)
  }
  row('เซนเซอร์', 'Full-frame 24MP', '', '')
  row(' รูรับแสง ', 'F1.8', 'Aperture', 'F1.8')
  row('', '', 'ISO', '100–51200')
  row('', '', '', '')

  assert.deepEqual(specsFromForm(form, 'specs'), [
    { label: 'เซนเซอร์', value: 'Full-frame 24MP' },
    { label: 'รูรับแสง', value: 'F1.8', labelEn: 'Aperture', valueEn: 'F1.8' },
    { label: 'ISO', value: '100–51200', labelEn: 'ISO', valueEn: '100–51200' },
  ])
})

test('เงื่อนไขค่าเช่าไม่ปนเงื่อนไขงานบริการ และแยกเงินประกันจากค่าเช่า', () => {
  for (const locale of ['th', 'en']) {
    const terms = rentalQuoteTerms(locale, 30)
    assert.doesNotMatch(terms, /50%|กรุงเทพ|Bangkok|ส่งมอบงาน|on delivery/)
    assert.match(terms, /30/)
  }
  assert.match(rentalQuoteTerms('th', 30), /เงินประกันอุปกรณ์เก็บแยกจากค่าเช่า/)
  assert.match(rentalQuoteTerms('en', 30), /security deposit/i)
})
