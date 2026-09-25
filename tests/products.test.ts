import assert from 'node:assert/strict'
import test from 'node:test'
import { lowestPlan, planPrice, planPriceTag, productQuoteLine } from '../src/lib/product-pricing'
import { plansFromForm } from '../src/lib/product-plans'
import { leadSchema } from '../src/lib/validations'

test('ราคาแพ็กเกจบอกหน่วยตามรอบการคิดเงิน และสอบถามราคาไม่มีตัวเลข', () => {
  assert.equal(planPriceTag({ price: 490, billing: 'MONTHLY' }, 'th'), '฿490 ต่อเดือน')
  // Intl คั่น "THB" กับตัวเลขด้วยช่องว่างไม่ตัดบรรทัด (U+00A0)
  assert.equal(planPriceTag({ price: '4900.00', billing: 'YEARLY' }, 'en'), 'THB 4,900 per year')
  assert.equal(planPriceTag({ price: 12900, billing: 'ONE_TIME' }, 'th'), '฿12,900 ซื้อขาด')
  // CUSTOM ไม่แสดงตัวเลขแม้แอดมินเผลอกรอกราคาไว้
  assert.equal(planPriceTag({ price: 999, billing: 'CUSTOM' }, 'th'), 'สอบถามราคา')
  assert.equal(planPriceTag({ price: null, billing: 'MONTHLY' }, 'en'), 'Price on request')
  assert.deepEqual(planPrice({ price: 490, billing: 'MONTHLY' }, 'th'), { amount: '฿490', unit: 'ต่อเดือน' })
})

test('ราคาเริ่มต้นเลือกตัวเลขต่ำสุดในบรรดาแพ็กเกจที่มีราคา', () => {
  const plans = [
    { id: 'custom', price: null, billing: 'CUSTOM' as const },
    { id: 'year', price: 4900, billing: 'YEARLY' as const },
    { id: 'month', price: 490, billing: 'MONTHLY' as const },
  ]
  assert.equal(lowestPlan(plans)?.id, 'month')
  assert.equal(lowestPlan([{ price: null, billing: 'CUSTOM' as const }]), null)
  assert.equal(lowestPlan([]), null)
})

test('รายการในใบเสนอราคาจากคำขอผลิตภัณฑ์', () => {
  assert.deepEqual(
    productQuoteLine({ locale: 'th', productName: 'ระบบจองคิว', planName: 'มาตรฐาน', plan: { price: 490, billing: 'MONTHLY' } }),
    { description: 'ระบบจองคิว · มาตรฐาน', quantity: '1', unit: 'เดือน', unitPrice: '490' },
  )
  // ไม่ได้เลือกแพ็กเกจ แอดมินต้องใส่ราคาเอง
  assert.deepEqual(
    productQuoteLine({ locale: 'en', productName: 'Booking', planName: null, plan: null }),
    { description: 'Booking', quantity: '1', unit: 'job', unitPrice: '' },
  )
})

function planForm(rows: Record<string, string>[], popular = '') {
  const form = new FormData()
  for (const row of rows) {
    for (const key of ['planId', 'planNameTh', 'planNameEn', 'planPrice', 'planBilling', 'planIncludesTh', 'planIncludesEn', 'planBuyUrl']) {
      form.append(key, row[key] ?? '')
    }
  }
  form.append('planPopular', popular)
  return form
}

test('ฟอร์มแพ็กเกจเก็บ id เดิม ข้ามแถวว่าง และแยกรายการที่ได้รับเป็นบรรทัด', () => {
  const result = plansFromForm(
    planForm(
      [
        { planId: 'plan-a', planNameTh: 'เริ่มต้น', planPrice: '1,290', planBilling: 'MONTHLY', planIncludesTh: 'ผู้ใช้ 1 คน\n\n จองได้ไม่จำกัด ' },
        { planNameTh: '', planNameEn: '' },
        { planNameTh: 'องค์กร', planPrice: '50000', planBilling: 'CUSTOM', planBuyUrl: 'https://shop.example.com/pro' },
      ],
      '2',
    ),
  )
  assert.equal(result.error, null)
  assert.deepEqual(
    result.rows?.map(({ id, nameTh, nameEn, price, billing, includesTh, isPopular, buyUrl, order }) => ({ id, nameTh, nameEn, price, billing, includesTh, isPopular, buyUrl, order })),
    [
      { id: 'plan-a', nameTh: 'เริ่มต้น', nameEn: 'เริ่มต้น', price: 1290, billing: 'MONTHLY', includesTh: ['ผู้ใช้ 1 คน', 'จองได้ไม่จำกัด'], isPopular: false, buyUrl: null, order: 1 },
      // สอบถามราคาไม่เก็บตัวเลข และ "เลือกมากที่สุด" อ้างตามดัชนีในฟอร์ม ไม่ใช่ตามลำดับหลังกรอง
      { id: null, nameTh: 'องค์กร', nameEn: 'องค์กร', price: null, billing: 'CUSTOM', includesTh: [], isPopular: true, buyUrl: 'https://shop.example.com/pro', order: 2 },
    ],
  )
})

test('ฟอร์มแพ็กเกจปฏิเสธราคาติดลบและลิงก์ที่ไม่ใช่ http(s)', () => {
  assert.match(plansFromForm(planForm([{ planNameTh: 'A', planPrice: '-5' }])).error ?? '', /ไม่ติดลบ/)
  assert.match(plansFromForm(planForm([{ planNameTh: 'A', planBuyUrl: 'javascript:alert(1)' }])).error ?? '', /http/)
})

const productLead = {
  name: 'ทดสอบ',
  email: 'customer@example.com',
  phone: '',
  company: '',
  services: [],
  budgetRange: '',
  message: '',
  equipmentIds: [],
  startDate: '',
  rentalDays: '',
  packageId: '',
  packageName: '',
  packagePriceTag: '',
  productId: 'cmproduct000000000000000',
  productPlanId: '',
  source: 'PRODUCT',
  website: '',
}

test('คำขอผลิตภัณฑ์ไม่บังคับพิมพ์ข้อความ แต่ฟอร์มติดต่อทั่วไปยังบังคับ', () => {
  assert.equal(leadSchema.safeParse(productLead).success, true)
  assert.equal(leadSchema.safeParse({ ...productLead, productId: '', source: 'CONTACT' }).success, false)
})
