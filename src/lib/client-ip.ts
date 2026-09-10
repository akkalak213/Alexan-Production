/**
 * เลือก IP ของผู้ใช้จริงจาก header ที่ proxy หน้าบ้านเขียนมาให้
 *
 * แยกออกมาเป็นฟังก์ชันบริสุทธิ์ที่ไม่แตะ env และไม่แตะ headers() ของ Next
 * เพราะตรรกะตรงนี้คือสิ่งที่เพดานกันสแปมและเพดานการเดารหัสผ่านทั้งระบบยืนอยู่บน
 * เลือกผิดไปทางหนึ่ง = ใครก็เดินผ่านเพดานได้ เลือกผิดไปอีกทาง = ทุกคนถูกนับรวมเป็นคนเดียวกัน
 * แล้วผู้เข้าชมคนที่หกของชั่วโมงนั้นจะส่งฟอร์มไม่ได้ทั้งที่ไม่ได้ทำอะไรผิด — จึงต้องเทสต์ได้ตรง ๆ
 */

export type ForwardHeaders = {
  /** Cloudflare เขียนหัวข้อนี้เอง และเขียนทับค่าที่ผู้เรียกแนบมาเสมอ */
  cfConnectingIp?: string | null
  forwardedFor?: string | null
  realIp?: string | null
}

export type PickIpOptions = {
  /**
   * จำนวน proxy ที่คั่นระหว่างผู้ใช้กับแอป ใช้กับ x-forwarded-for เท่านั้น
   * มีผลเฉพาะตอนที่ไม่มี cf-connecting-ip ให้ใช้
   */
  hops: number
}

/** ตัดค่าที่เป็นช่องว่างล้วนหรือค่าที่ proxy เขียนว่าไม่รู้ทิ้ง */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && trimmed.toLowerCase() !== 'unknown' ? trimmed : null
}

/**
 * ค่าที่เชื่อได้ที่สุดคือ cf-connecting-ip
 *
 * โดเมนของเราชี้เข้า Cloudflare แล้ววิ่งต่อไป Railway อีกทอด (ตรวจแล้ว: ปลายทางเป็น IP ของ Cloudflare
 * และ response มี CF-RAY ติดมา) Cloudflare เป็นคนเขียนหัวข้อนี้เอง และเขียนทับค่าที่ผู้เรียกแนบมาเสมอ
 * จึงไม่ต้องนับชั้น proxy ให้ถูกก่อนถึงจะใช้ได้ ซึ่งเป็นตัวเลขที่ผิดง่ายและผิดแบบเงียบ ๆ
 *
 * ถ้าวันหนึ่งถอด Cloudflare ออก หัวข้อนี้จะหายไปเอง แล้วโค้ดจะตกไปนับ x-forwarded-for
 * ด้วยค่า hops เริ่มต้นซึ่งถูกต้องสำหรับ Railway ล้วน ๆ พอดี — ไม่ต้องไปแก้อะไรตาม
 *
 * ข้อจำกัดที่รับไว้: ถ้ามีคนหาที่อยู่ origin ของ Railway เจอแล้วยิงตรงโดยไม่ผ่าน Cloudflare
 * เขาแต่งหัวข้อนี้เองได้ แต่ในสถานการณ์เดียวกันเขาก็แต่ง x-forwarded-for ได้อยู่แล้ว
 * การเชื่อหัวข้อนี้ก่อนจึงไม่ได้เปิดช่องอะไรเพิ่มจากเดิม
 */
export function pickClientIp(headers: ForwardHeaders, { hops }: PickIpOptions): string | null {
  const fromCloudflare = clean(headers.cfConnectingIp)
  if (fromCloudflare) return fromCloudflare

  const fromChain = pickFromForwardedFor(headers.forwardedFor, hops)
  if (fromChain) return fromChain

  // ไม่มีสักหัวข้อ = ต่อตรงถึงแอป (dev ในเครื่อง หรือ health check ภายใน)
  return clean(headers.realIp)
}

/**
 * x-forwarded-for เป็นสายที่ต่อกันไปเรื่อย: ค่าที่ผู้เรียกแต่งเองมาอยู่หัวสาย
 * ส่วน proxy ที่เราวางไว้เองจะ "ต่อท้าย" IP ที่ตัวเองเห็นเสมอ ค่าที่เชื่อได้จึงนับจากท้าย
 */
export function pickFromForwardedFor(
  forwardedFor: string | null | undefined,
  hops: number,
): string | null {
  const chain = (forwardedFor ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!chain.length) return null

  // สายสั้นกว่าที่ตั้งไว้แปลว่าตั้งค่าเกินจริง — ถอยไปใช้ตัวแรกที่มี ยังเป็นค่าที่ proxy เขียนอยู่ดี
  const index = Math.max(0, chain.length - Math.max(1, Math.trunc(hops) || 1))
  return clean(chain[index])
}
