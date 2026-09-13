import assert from 'node:assert/strict'
import test from 'node:test'
import { leadNotificationEmail, leadReceiptEmail, type LeadEmailData } from '../src/lib/lead-email'

const request: LeadEmailData = {
  refCode: 'AX-2609-0002',
  locale: 'th',
  source: 'RENTAL',
  name: '<b>คุณทดสอบ</b>',
  email: 'customer@example.com',
  phone: null,
  company: null,
  services: [],
  budgetRange: 'under-50k',
  packageName: null,
  packagePriceTag: null,
  message: 'ไปที่ http://spam.example <script>alert(1)</script>',
  rental: {
    startDate: '2026-09-20',
    days: 3,
    items: [{ label: 'Panasonic Lumix S5 mark 2', amount: 6000, isOnRequest: false }],
    subtotal: 6000,
    deposit: 3000,
    hasOnRequest: false,
  },
}

const company = { name: 'Alexan Production', phone: '', email: 'team@example.com', lineId: '' }
const links = {
  lead: 'https://alexan.studio/admin/leads/abc',
  newQuote: 'https://alexan.studio/admin/quotes/new?leadId=abc',
}

test('อีเมลแจ้งทีมใช้ป้ายภาษาไทยแทนรหัสดิบ มีปุ่มออกใบเสนอราคา และหนี HTML', () => {
  const { subject, html } = leadNotificationEmail(request, links)

  assert.match(subject, /AX-2609-0002 · เช่าอุปกรณ์/)
  assert.doesNotMatch(html, /RENTAL|under-50k/)
  assert.match(html, /ต่ำกว่า 50,000 บาท/)
  assert.match(html, /admin\/quotes\/new\?leadId=abc/)
  assert.match(html, /฿6,000/)
  assert.match(html, /\(3 วัน\)/)
  assert.doesNotMatch(html, /<script>|<b>/)
})

test('อีเมลถึงลูกค้าไม่มีข้อความหรือชื่อที่คนกรอกฟอร์มพิมพ์เอง', () => {
  const { subject, html } = leadReceiptEmail(request, company)

  assert.match(subject, /AX-2609-0002/)
  assert.doesNotMatch(html, /spam\.example|คุณทดสอบ|script/)
  assert.match(html, /Panasonic Lumix S5 mark 2/)
  assert.match(html, /฿6,000/)
  assert.match(html, /ยังไม่ได้จองคิวอุปกรณ์/)
})

test('อีเมลถึงลูกค้าตามภาษาที่ใช้กรอกฟอร์ม', () => {
  const { subject, html } = leadReceiptEmail(
    { ...request, locale: 'en', source: 'CONTACT', rental: null, services: ['PHOTOGRAPHY', 'VIDEO'] },
    company,
  )

  assert.match(subject, /^We received your request AX-2609-0002/)
  assert.match(html, /Photography, Video/)
  assert.doesNotMatch(html, /ได้รับคำขอ/)
})
