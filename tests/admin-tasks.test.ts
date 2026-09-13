import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAdminTasks, type AdminTaskInput } from '../src/lib/admin-tasks'

const now = new Date('2026-09-13T05:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)

const empty: AdminTaskInput = {
  staleLeads: { count: 0, rows: [] },
  freshLeadCount: 0,
  unsentQuotes: { count: 0, rows: [] },
  expiringQuotes: { count: 0, rows: [] },
  followUpLeads: { count: 0, rows: [] },
  pendingReviews: 0,
  placeholderPosts: 0,
  incompleteEquipment: 0,
  mediaWithoutAlt: 0,
}

test('ไม่มีงานค้างก็ไม่มีรายการ', () => {
  assert.deepEqual(buildAdminTasks(empty, now), [])
})

test('งานเร่งขึ้นก่อน และมีรายการเดียวลิงก์ตรงไปที่รายการนั้น', () => {
  const tasks = buildAdminTasks(
    {
      ...empty,
      pendingReviews: 2,
      staleLeads: { count: 1, rows: [{ id: 'l1', refCode: 'AX-2609-0001', name: 'ทดสอบ', createdAt: daysAgo(3) }] },
      unsentQuotes: {
        count: 2,
        rows: [
          { id: 'q1', quoteNumber: 'QT-2609-0001', customerName: 'ก', createdAt: daysAgo(1) },
          { id: 'q2', quoteNumber: 'QT-2609-0002', customerName: 'ข', createdAt: daysAgo(1) },
        ],
      },
    },
    now,
  )

  assert.deepEqual(tasks.map((task) => task.id), ['stale-leads', 'unsent-quotes', 'reviews'])
  assert.equal(tasks[0].href, '/admin/leads/l1')
  assert.match(tasks[0].detail, /รอมา 3 วัน/)
  assert.equal(tasks[1].href, '/admin/quotes')
})

test('ใบเสนอราคาที่หมดอายุแล้วกับที่ใกล้หมดบอกต่างกัน', () => {
  const [task] = buildAdminTasks(
    {
      ...empty,
      expiringQuotes: {
        count: 2,
        rows: [
          { id: 'a', quoteNumber: 'QT-1', customerName: 'ก', validUntil: daysAgo(1) },
          { id: 'b', quoteNumber: 'QT-2', customerName: 'ข', validUntil: new Date(now.getTime() + 2 * 86_400_000) },
        ],
      },
    },
    now,
  )

  assert.match(task.detail, /QT-1 ก หมดอายุแล้ว/)
  assert.match(task.detail, /QT-2 ข หมดอายุ 15 ก\.ย\./)
})

test('รายการยาวย่อเหลือสองรายการแล้วบอกจำนวนที่เหลือ', () => {
  const rows = [1, 2, 3, 4].map((n) => ({ id: `l${n}`, refCode: `AX-${n}`, name: `คน${n}`, createdAt: daysAgo(2) }))
  const [task] = buildAdminTasks({ ...empty, staleLeads: { count: 4, rows } }, now)

  assert.match(task.detail, /และอีก 2 รายการ$/)
  assert.equal(task.href, '/admin/leads?status=NEW')
})
