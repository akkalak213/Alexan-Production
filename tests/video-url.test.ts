import assert from 'node:assert/strict'
import test from 'node:test'
import { parseVideoUrl, videoEmbedUrl, videoThumbnailUrl } from '../src/lib/format'

/**
 * id ที่แกะจากลิงก์ถูกต่อเข้าไปใน src ของ iframe ตรง ๆ
 * ลิงก์วิดีโอมาจากช่องกรอกในหลังบ้าน ไม่ใช่ค่าที่เขียนไว้ในโค้ด
 * ค่าที่แทรกอักขระพิเศษเข้ามาได้จึงเปลี่ยนปลายทางที่ฝังจริงไปจากที่ตั้งใจ
 */

test('แกะ id จากลิงก์รูปแบบที่ลูกค้าส่งมาจริง', () => {
  assert.deepEqual(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ'), {
    provider: 'youtube',
    id: 'dQw4w9WgXcQ',
  })
  assert.deepEqual(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), {
    provider: 'youtube',
    id: 'dQw4w9WgXcQ',
  })
  assert.deepEqual(parseVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), {
    provider: 'youtube',
    id: 'dQw4w9WgXcQ',
  })
  assert.deepEqual(parseVideoUrl('https://vimeo.com/123456789'), {
    provider: 'vimeo',
    id: '123456789',
  })
})

test('id ที่มีอักขระนอกชุดของ id จริงต้องไม่ผ่าน', () => {
  const crafted = [
    // พาออกจาก /embed/ ไปที่เส้นทางอื่นบนโดเมนเดียวกัน
    'https://www.youtube.com/watch?v=../../something',
    // ต่อพารามิเตอร์เข้าไปใน src ที่เราประกอบเอง
    'https://www.youtube.com/watch?v=abc%22%3E%3Cscript%3E',
    'https://youtu.be/a/b/c',
  ]

  for (const url of crafted) {
    assert.equal(parseVideoUrl(url), null, `${url} ต้องไม่ผ่าน`)
  }
})

test('โดเมนที่ไม่ใช่ผู้ให้บริการวิดีโอต้องไม่ผ่าน', () => {
  for (const url of [
    'https://evil.example.com/embed/x',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ไม่ใช่ลิงก์',
    '',
    null,
  ]) {
    assert.equal(parseVideoUrl(url), null, `${String(url)} ต้องไม่ผ่าน`)
  }
})

test('URL ที่ประกอบออกมาอยู่บนโดเมนของผู้ให้บริการเสมอ', () => {
  const youtube = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')!
  const vimeo = parseVideoUrl('https://vimeo.com/123456789')!

  assert.equal(
    videoEmbedUrl(youtube),
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
  )
  assert.equal(videoEmbedUrl(vimeo), 'https://player.vimeo.com/video/123456789')
  assert.equal(
    videoThumbnailUrl(youtube),
    'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  )
})
