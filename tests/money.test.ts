import assert from 'node:assert/strict'
import test from 'node:test'
import { bahtText } from '../src/lib/baht-text'
import { divideRounded, toScaledInt, toSatang } from '../src/lib/money'
import { computeQuoteTotals, lineAmount, normalizeLine, normalizeRate, quoteInputProblem } from '../src/lib/quote-math'
import { rentalEstimateTotals, rentalLineTotal } from '../src/lib/rental-pricing'

/**
 * ตัวเลขในไฟล์นี้ไปอยู่บนใบเสนอราคาที่ลูกค้าเซ็นและฝ่ายบัญชีเอาไปลงบัญชี
 * ผิดหนึ่งสตางค์ก็เป็นเอกสารที่ต้องออกใหม่ ทุกค่าที่คาดไว้คำนวณมือแบบปัดครึ่งขึ้นที่สตางค์
 */

// ─────────────────────────── การแปลงตัวเลข ───────────────────────────

test('แปลงเป็นจำนวนเต็มโดยไม่ผ่านทศนิยมลอยตัว', () => {
  // สามค่านี้คือกรณีที่ Math.round(x * 100) / 100 ปัดผิด
  assert.equal(toScaledInt('1.005', 2), 101n)
  assert.equal(toScaledInt(1.005, 2), 101n)
  assert.equal(toScaledInt('2.675', 2), 268n)

  assert.equal(toScaledInt('0.005', 2), 1n)
  assert.equal(toScaledInt('0.0049', 2), 0n)
  assert.equal(toScaledInt('1,234.5', 2), 123450n)
  assert.equal(toScaledInt('฿ 2,000', 2), 200000n)
  assert.equal(toScaledInt('-1.005', 2), -101n)
  assert.equal(toScaledInt('5e-3', 2), 1n)
  assert.equal(toScaledInt(1e21, 0), 10n ** 21n)
  // Decimal ของ Prisma แปลงเป็นข้อความได้ตรงตัว
  assert.equal(toScaledInt({ toString: () => '12.34' }, 2), 1234n)
})

test('ค่าที่อ่านไม่ออกเป็นศูนย์ ไม่ใช่ NaN', () => {
  for (const value of ['', 'abc', null, undefined, Number.NaN, Number.POSITIVE_INFINITY, '1e999']) {
    assert.equal(toSatang(value), 0n, String(value))
  }
})

test('หารปัดครึ่งออกจากศูนย์', () => {
  assert.equal(divideRounded(5n, 2n), 3n)
  assert.equal(divideRounded(4n, 2n), 2n)
  assert.equal(divideRounded(7_525_000n, 10_000n), 753n)
  assert.equal(divideRounded(-5n, 2n), -3n)
})

// ─────────────────────────── ใบเสนอราคา ───────────────────────────

test('VAT ที่ลงท้ายครึ่งสตางค์ปัดขึ้น', () => {
  // 107.50 × 7% = 7.525 → 7.53 (สูตรเดิมได้ 7.52)
  const totals = computeQuoteTotals({ lines: [{ quantity: 1, unitPrice: 107.5 }], vatRate: 7 })
  assert.equal(totals.vatAmount, 7.53)
  assert.equal(totals.total, 115.03)
})

test('ใบเสนอราคางานบริการครบทุกขั้น', () => {
  const totals = computeQuoteTotals({
    lines: [
      { quantity: 2, unitPrice: 15000 },
      { quantity: '1', unitPrice: '3,500.50' },
    ],
    discount: 1000,
    vatRate: 7,
    withholdingRate: 3,
  })

  assert.deepEqual(totals, {
    subtotal: 33500.5,
    discount: 1000,
    afterDiscount: 32500.5,
    // 32,500.50 × 7% = 2,275.035 → 2,275.04
    vatAmount: 2275.04,
    // 32,500.50 × 3% = 975.015 → 975.02 คิดจากฐานก่อน VAT
    withholdingAmount: 975.02,
    total: 33800.52,
  })
})

test('ยอดรวมเท่ากับผลรวมของบรรทัดที่พิมพ์บนเอกสาร', () => {
  // 1.5 × 333.33 = 499.995 → 500.00 ต่อบรรทัด สองบรรทัดต้องได้ 1,000.00 ไม่ใช่ 999.99
  const lines = [
    { quantity: '1.5', unitPrice: '333.33' },
    { quantity: '1.5', unitPrice: '333.33' },
  ]
  assert.equal(lineAmount(lines[0]), 500)
  assert.equal(computeQuoteTotals({ lines, vatRate: 0 }).subtotal, 1000)
})

test('ทศนิยมที่ JavaScript บวกเพี้ยนต้องได้ค่าตรง', () => {
  assert.equal(computeQuoteTotals({ lines: [{ quantity: 3, unitPrice: 0.1 }], vatRate: 0 }).subtotal, 0.3)
  assert.equal(
    computeQuoteTotals({
      lines: [
        { quantity: 1, unitPrice: 0.1 },
        { quantity: 1, unitPrice: 0.2 },
      ],
      vatRate: 0,
    }).total,
    0.3,
  )
})

test('ส่วนลดเกินยอดรวมถูกจำกัดไว้ที่ยอดรวม และอัตราถูกจำกัด 0–100%', () => {
  const discounted = computeQuoteTotals({ lines: [{ quantity: 1, unitPrice: 100 }], discount: 150, vatRate: 7 })
  assert.equal(discounted.discount, 100)
  assert.equal(discounted.total, 0)

  const capped = computeQuoteTotals({ lines: [{ quantity: 1, unitPrice: 100 }], vatRate: 150 })
  assert.equal(capped.vatAmount, 100)
})

test('ค่าที่บันทึกลงฐานข้อมูลคือค่าเดียวกับที่ใช้คำนวณ', () => {
  assert.deepEqual(normalizeLine({ quantity: '2.005', unitPrice: '1,000.125' }), { quantity: 2.01, unitPrice: 1000.13 })
  assert.equal(normalizeRate('7'), 7)
  assert.equal(normalizeRate('1.5'), 1.5)
  assert.equal(normalizeRate(''), 0)
})

test('ข้อมูลที่บันทึกไม่ได้ต้องได้ข้อความบอกผู้กรอก', () => {
  const ok = { lines: [{ quantity: '1', unitPrice: '500' }], discount: '0', vatRate: '7', withholdingRate: '3' }
  assert.equal(quoteInputProblem(ok), null)

  const cases: [string, Parameters<typeof quoteInputProblem>[0]][] = [
    ['ราคาติดลบ', { ...ok, lines: [{ quantity: '1', unitPrice: '-500' }] }],
    ['จำนวนเป็นศูนย์', { ...ok, lines: [{ quantity: '0', unitPrice: '500' }] }],
    ['จำนวนว่าง', { ...ok, lines: [{ quantity: '', unitPrice: '500' }] }],
    ['จำนวนไม่ใช่ตัวเลข', { ...ok, lines: [{ quantity: '2 วัน', unitPrice: '500' }] }],
    ['ส่วนลดติดลบ', { ...ok, discount: '-10' }],
    ['ส่วนลดเกินยอด', { ...ok, discount: '600' }],
    ['VAT เกิน 100', { ...ok, vatRate: '107' }],
    ['หัก ณ ที่จ่ายติดลบ', { ...ok, withholdingRate: '-3' }],
    ['ยอดเกินคอลัมน์', { ...ok, lines: [{ quantity: '99999999', unitPrice: '999999' }] }],
  ]

  for (const [label, input] of cases) {
    assert.equal(typeof quoteInputProblem(input), 'string', label)
  }
})

// ─────────────────────────── ค่าเช่าอุปกรณ์ ───────────────────────────

test('ค่าเช่ารายวัน', () => {
  const line = rentalLineTotal({ dailyRate: 2000, weeklyRate: null, quantity: 1 }, 3)
  assert.equal(line.amount, 6000)
  assert.equal(line.isOnRequest, false)
})

test('เรตสัปดาห์ใช้เมื่อถูกกว่าเท่านั้น', () => {
  const cheaper = rentalLineTotal({ dailyRate: 1000, weeklyRate: 5000, quantity: 1 }, 9)
  assert.deepEqual(cheaper, { isOnRequest: false, amount: 7000, weeks: 1, extraDays: 2 })

  // ตั้งเรตสัปดาห์แพงกว่ารายวันคูณเจ็ด ลูกค้าต้องได้ราคารายวัน
  const pricier = rentalLineTotal({ dailyRate: 100, weeklyRate: 900, quantity: 2 }, 7)
  assert.deepEqual(pricier, { isOnRequest: false, amount: 1400, weeks: 0, extraDays: 7 })
})

test('ค่าเช่าที่มีสตางค์ไม่เพี้ยน และของที่ยังไม่ประกาศราคาถูกบอกไว้', () => {
  assert.equal(rentalLineTotal({ dailyRate: 333.33, weeklyRate: null, quantity: 1 }, 3).amount, 999.99)
  assert.equal(rentalLineTotal({ dailyRate: null, weeklyRate: null, quantity: 1 }, 3).isOnRequest, true)
})

test('ยอดรวมค่าเช่าคิด VAT แบบเดียวกับใบเสนอราคา', () => {
  const totals = rentalEstimateTotals({ amounts: [107.5], deposits: [1000, 500.5], vatRate: 7, hasOnRequest: false })
  assert.deepEqual(totals, { subtotal: 107.5, vatAmount: 7.53, total: 115.03, deposit: 1500.5, hasOnRequest: false })
})

// ─────────────────────────── จำนวนเงินเป็นตัวอักษร ───────────────────────────

test('อ่านจำนวนเงินเป็นตัวอักษรตามแบบ BAHTTEXT', () => {
  const cases: [number | string, string][] = [
    [0, 'ศูนย์บาทถ้วน'],
    [1, 'หนึ่งบาทถ้วน'],
    [10, 'สิบบาทถ้วน'],
    [11, 'สิบเอ็ดบาทถ้วน'],
    [21, 'ยี่สิบเอ็ดบาทถ้วน'],
    [101, 'หนึ่งร้อยเอ็ดบาทถ้วน'],
    [1001, 'หนึ่งพันเอ็ดบาทถ้วน'],
    [15000, 'หนึ่งหมื่นห้าพันบาทถ้วน'],
    [1_000_000, 'หนึ่งล้านบาทถ้วน'],
    [1_000_001, 'หนึ่งล้านเอ็ดบาทถ้วน'],
    // สองกรณีนี้รุ่นก่อนอ่านผิด
    [10_000_001, 'สิบล้านเอ็ดบาทถ้วน'],
    [100.01, 'หนึ่งร้อยบาทหนึ่งสตางค์'],
    [21_000_000, 'ยี่สิบเอ็ดล้านบาทถ้วน'],
    [0.5, 'ห้าสิบสตางค์'],
    [0.21, 'ยี่สิบเอ็ดสตางค์'],
    ['123456789.25', 'หนึ่งร้อยยี่สิบสามล้านสี่แสนห้าหมื่นหกพันเจ็ดร้อยแปดสิบเก้าบาทยี่สิบห้าสตางค์'],
    [33800.52, 'สามหมื่นสามพันแปดร้อยบาทห้าสิบสองสตางค์'],
    [-50, 'ลบห้าสิบบาทถ้วน'],
  ]

  for (const [amount, expected] of cases) {
    assert.equal(bahtText(amount), expected, String(amount))
  }
})

test('ค่าที่ไม่ใช่จำนวนจริงไม่ถูกอ่าน', () => {
  assert.equal(bahtText(Number.NaN), '')
  assert.equal(bahtText(Number.POSITIVE_INFINITY), '')
})
