import assert from 'node:assert/strict'
import test from 'node:test'
import { computeQuoteTotals } from '../src/lib/quote-math'
import { rentalLineTotal } from '../src/lib/rental-pricing'
import {
  defaultWithholdingRate,
  packageQuoteLine,
  rentalQuoteLines,
  rentalQuoteNotes,
} from '../src/lib/rental-quote'
import {
  addDaysIso,
  isIsoDate,
  parseRentalDays,
  rentalEndDate,
  rentalRequestEstimate,
} from '../src/lib/rental-request'

/**
 * คำขอเช่าอุปกรณ์กับใบเสนอราคาที่ออกจากคำขอนั้น
 * ยอดในฟอร์ม ในอีเมล ในหลังบ้าน และบนใบเสนอราคาต้องเป็นตัวเลขเดียวกันกับใบเสนอราคาเบื้องต้น
 */

const s5 = { id: 's5', label: 'Panasonic Lumix S5 mark 2', dailyRate: 2000, weeklyRate: 8000, deposit: 3000 }
const light = { id: 'light', label: 'YongMei YM-S60', dailyRate: 200, weeklyRate: 600, deposit: 200 }

test('จำนวนวันที่พิมพ์มาแปลกๆ ไม่ทำให้ยอดเพี้ยน', () => {
  assert.equal(parseRentalDays('3'), 3)
  assert.equal(parseRentalDays(''), 1)
  assert.equal(parseRentalDays('0'), 1)
  assert.equal(parseRentalDays('-2'), 1)
  assert.equal(parseRentalDays('2.9'), 2)
  assert.equal(parseRentalDays('9999'), 365)
  assert.equal(parseRentalDays('abc', 7), 7)
})

test('วันที่ต้องมีจริงในปฏิทิน และวันคืนนับวันแรกเป็นวันที่หนึ่ง', () => {
  assert.equal(isIsoDate('2026-09-20'), true)
  assert.equal(isIsoDate('2026-02-31'), false)
  assert.equal(isIsoDate('20/09/2026'), false)
  assert.equal(addDaysIso('2026-12-30', 3), '2027-01-02')
  assert.equal(rentalEndDate('2026-09-20', 1), '2026-09-20')
  assert.equal(rentalEndDate('2026-09-20', 3), '2026-09-22')
})

test('ค่าเช่าโดยประมาณใช้เรตสัปดาห์เมื่อถูกกว่า และมัดจำไม่รวมในค่าเช่า', () => {
  const estimate = rentalRequestEstimate([s5, light], 9)
  // S5: 1 สัปดาห์ 8,000 + 2 วัน 4,000 · ไฟ: 1 สัปดาห์ 600 + 2 วัน 400
  assert.deepEqual(estimate.lines.map((line) => line.amount), [12000, 1000])
  assert.equal(estimate.subtotal, 13000)
  assert.equal(estimate.deposit, 3200)
  assert.equal(estimate.hasOnRequest, false)

  const onRequest = rentalRequestEstimate([{ ...s5, dailyRate: null }], 2)
  assert.equal(onRequest.hasOnRequest, true)
  assert.equal(onRequest.subtotal, 0)
})

test('รายการบนใบเสนอราคารวมแล้วเท่ากับใบเสนอราคาเบื้องต้นทุกจำนวนวัน', () => {
  const items = [s5, light, { ...s5, label: 'เรตสัปดาห์แพงกว่ารายวัน', weeklyRate: 20000 }]
  for (const days of [1, 3, 6, 7, 9, 14, 30]) {
    for (const item of items) {
      for (const quantity of [1, 2]) {
        const lines = rentalQuoteLines([{ label: item.label, quantity, days, dailyRate: item.dailyRate, weeklyRate: item.weeklyRate }])
        const quoted = computeQuoteTotals({ lines, discount: '0', vatRate: 0 }).subtotal
        const expected = rentalLineTotal({ dailyRate: item.dailyRate, weeklyRate: item.weeklyRate, quantity }, days).amount
        assert.equal(quoted, expected, `${item.label} × ${quantity}, ${days} วัน`)
      }
    }
  }
})

test('รายการแยกสัปดาห์กับวันที่เกิน พร้อมราคาต่อหน่วยจากเรตในระบบ', () => {
  assert.deepEqual(rentalQuoteLines([{ label: 'S5', quantity: 1, days: 9, dailyRate: 2000, weeklyRate: 8000 }]), [
    { description: 'S5 — ค่าเช่ารายสัปดาห์', quantity: '1', unit: 'สัปดาห์', unitPrice: '8000' },
    { description: 'S5 — ค่าเช่ารายวัน ส่วนที่เกินสัปดาห์', quantity: '2', unit: 'วัน', unitPrice: '2000' },
  ])

  // ลูกค้าไม่ได้ระบุจำนวนวัน ตั้งไว้ 1 วัน
  assert.deepEqual(rentalQuoteLines([{ label: 'S5', quantity: 2, days: null, dailyRate: 2000, weeklyRate: null }]), [
    { description: 'S5 × 2 ชิ้น — ค่าเช่า 1 วัน', quantity: '2', unit: 'วัน', unitPrice: '2000' },
  ])

  // ยังไม่ตั้งเรต ปล่อยราคาว่างให้แอดมินกรอก ไม่ใส่ 0 ที่ดูเหมือนให้เช่าฟรี
  assert.equal(rentalQuoteLines([{ label: 'X', quantity: 1, days: 2, dailyRate: null, weeklyRate: null }])[0].unitPrice, '')

  assert.equal(
    rentalQuoteLines([{ label: 'S5', quantity: 1, days: 3, dailyRate: 2000, weeklyRate: null }], { locale: 'en' })[0].description,
    'S5 — rental, 3 days',
  )
})

test('หัก ณ ที่จ่ายตั้งต้นตามชนิดลูกค้าและชนิดรายได้', () => {
  assert.equal(defaultWithholdingRate({ isRental: true, hasCompany: false, serviceRate: 3 }), 0)
  assert.equal(defaultWithholdingRate({ isRental: false, hasCompany: false, serviceRate: 3 }), 0)
  assert.equal(defaultWithholdingRate({ isRental: true, hasCompany: true, serviceRate: 3 }), 5)
  assert.equal(defaultWithholdingRate({ isRental: false, hasCompany: true, serviceRate: 3 }), 3)
})

test('แพ็กเกจที่ลูกค้าเลือกกลายเป็นรายการแรกพร้อมราคา', () => {
  assert.deepEqual(
    packageQuoteLine({ serviceName: 'งานถ่ายภาพ', packageName: 'ครึ่งวัน', priceFrom: 6000, priceUnit: 'HALF_DAY' }),
    { description: 'งานถ่ายภาพ · ครึ่งวัน', quantity: '1', unit: 'ครึ่งวัน', unitPrice: '6000' },
  )
  assert.equal(packageQuoteLine({ serviceName: null, packageName: 'ตามขอบเขต', priceFrom: 1, priceUnit: 'CUSTOM' }).unitPrice, '')
})

test('หมายเหตุบอกช่วงวันที่ใช้งานและเงินมัดจำ', () => {
  const notes = rentalQuoteNotes({ startDate: '2026-09-20', days: 3, deposit: 3200 })
  assert.match(notes, /\(3 วัน\)/)
  assert.match(notes, /฿3,200\.00/)
  assert.equal(rentalQuoteNotes({ startDate: null, days: null, deposit: 0 }), '')
})
