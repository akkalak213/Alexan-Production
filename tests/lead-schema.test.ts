import assert from 'node:assert/strict'
import test from 'node:test'
import { bangkokDateString } from '../src/lib/bangkok-time'
import { addDaysIso } from '../src/lib/rental-request'
import { leadSchema } from '../src/lib/validations'

const contact = {
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
  source: 'CONTACT',
  website: '',
}

const rental = { ...contact, source: 'RENTAL', equipmentIds: ['cmslwzyy9001vsowzsgm6626t'], rentalDays: '1' }

test('ฟอร์มติดต่อทั่วไปยังต้องเล่ารายละเอียดอย่างน้อย 10 ตัวอักษร', () => {
  const empty = leadSchema.safeParse(contact)
  assert.equal(empty.success, false)
  assert.deepEqual(empty.error?.issues.map((issue) => issue.path[0]), ['message'])

  assert.equal(leadSchema.safeParse({ ...contact, message: 'อยากทำเว็บไซต์ร้าน' }).success, true)
})

test('คำขอเช่าอุปกรณ์ไม่บังคับพิมพ์ข้อความ และแปลงจำนวนวันเป็นตัวเลข', () => {
  const parsed = leadSchema.safeParse({ ...rental, rentalDays: '3' })
  assert.equal(parsed.success, true)
  assert.equal(parsed.data?.rentalDays, 3)
})

test('วันที่เริ่มใช้ต้องไม่ย้อนหลังตามเวลาไทย และไม่ไกลเกินสองปี', () => {
  const today = bangkokDateString()

  assert.equal(leadSchema.safeParse({ ...rental, startDate: today }).success, true)
  assert.equal(leadSchema.safeParse({ ...rental, startDate: addDaysIso(today, 30) }).success, true)
  assert.equal(leadSchema.safeParse({ ...rental, startDate: addDaysIso(today, -1) }).success, false)
  assert.equal(leadSchema.safeParse({ ...rental, startDate: addDaysIso(today, 800) }).success, false)
  assert.equal(leadSchema.safeParse({ ...rental, startDate: '2026-02-31' }).success, false)
})

test('จำนวนวันอยู่ในช่วง 1–365', () => {
  assert.equal(leadSchema.safeParse({ ...rental, rentalDays: '0' }).success, false)
  assert.equal(leadSchema.safeParse({ ...rental, rentalDays: '366' }).success, false)
  assert.equal(leadSchema.safeParse({ ...rental, rentalDays: '1.5' }).success, false)
  assert.equal(leadSchema.safeParse({ ...rental, rentalDays: '365' }).success, true)
})
