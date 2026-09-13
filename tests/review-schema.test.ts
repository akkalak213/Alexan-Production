import assert from 'node:assert/strict'
import test from 'node:test'
import { reviewSchema } from '../src/lib/validations'

const review = {
  authorName: 'สมชาย',
  authorRole: '',
  submitterEmail: '',
  content: 'ถ่ายภาพสินค้าออกมาสวยมาก ส่งงานตรงเวลา',
  rating: '5',
  serviceCategory: 'PHOTOGRAPHY',
  website: '',
}

const failedFields = (input: Record<string, unknown>) => {
  const parsed = reviewSchema.safeParse(input)
  return parsed.success ? [] : parsed.error.issues.map((issue) => String(issue.path[0]))
}

test('รีวิวที่กรอกครบผ่าน', () => {
  assert.deepEqual(failedFields(review), [])
})

test('ต้องมีชื่อ บริการที่ใช้ และคำรีวิว', () => {
  assert.deepEqual(failedFields({ ...review, authorName: ' ' }), ['authorName'])
  assert.deepEqual(failedFields({ ...review, serviceCategory: '' }), ['serviceCategory'])
  assert.deepEqual(failedFields({ ...review, content: '' }), ['content'])
  assert.deepEqual(failedFields({ ...review, authorName: '', serviceCategory: '', content: '' }).sort(), [
    'authorName',
    'content',
    'serviceCategory',
  ])
})

test('บริการต้องเป็นหมวดที่มีอยู่จริง และคำรีวิวต้องยาวพอ', () => {
  assert.deepEqual(failedFields({ ...review, serviceCategory: 'CATERING' }), ['serviceCategory'])
  assert.deepEqual(failedFields({ ...review, content: 'ดีมาก' }), ['content'])
})

test('ตำแหน่งกับอีเมลยังเว้นว่างได้', () => {
  assert.deepEqual(failedFields({ ...review, authorRole: '', submitterEmail: '' }), [])
  assert.deepEqual(failedFields({ ...review, submitterEmail: 'ไม่ใช่อีเมล' }), ['submitterEmail'])
})
