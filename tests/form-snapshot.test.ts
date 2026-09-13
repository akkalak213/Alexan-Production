import assert from 'node:assert/strict'
import test from 'node:test'
import { serializeFormEntries } from '../src/lib/form-snapshot'

/** ใช้บอกว่าฟอร์มหลังบ้านมีอะไรแก้ค้าง ตัวเตือนก่อนออกจากหน้าเชื่อค่านี้ */

const snap = (pairs: [string, string][]) => serializeFormEntries(pairs)

test('ช่องที่ระบบเปลี่ยนเองไม่นับว่าผู้ใช้แก้', () => {
  assert.equal(snap([['title', 'ก'], ['expectedVersion', '1']]), snap([['title', 'ก'], ['expectedVersion', '2']]))
  assert.equal(snap([['title', 'ก'], ['$ACTION_ID_abc', '']]), snap([['title', 'ก']]))
})

test('พิมพ์แล้วลบกลับเป็นค่าเดิมไม่นับว่าแก้ แต่สลับลำดับหรือเอารูปออกนับว่าแก้', () => {
  assert.equal(snap([['title', 'ก']]), snap([['title', 'ก']]))
  assert.notEqual(snap([['mediaUrl', '1'], ['mediaUrl', '2']]), snap([['mediaUrl', '2'], ['mediaUrl', '1']]))
  assert.notEqual(snap([['mediaUrl', '1']]), snap([]))
})

test('ค่าที่มีเครื่องหมายเท่ากับไม่ปนกับชื่อช่อง', () => {
  assert.notEqual(snap([['a', 'b=c']]), snap([['a=b', 'c']]))
})

test('รับ FormData ของจริงรวมไฟล์ได้', () => {
  const data = new FormData()
  data.append('title', 'ก')
  data.append('cover', new File(['x'], 'a.png'))
  assert.match(serializeFormEntries(data), /file:a\.png:1/)
})
