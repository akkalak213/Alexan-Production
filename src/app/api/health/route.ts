import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isMailConfigured, isR2Configured } from '@/lib/env'

// ต้องเช็คสดทุกครั้ง ห้ามให้ Next แคชผลลัพธ์
export const dynamic = 'force-dynamic'

/**
 * บอกครั้งเดียวตอนตรวจสุขภาพครั้งแรกของ process ว่าบริการเสริมตัวไหนยังไม่ได้ตั้งค่า
 * Railway ยิง health check ทุกไม่กี่วินาที ถ้าเขียนทุกครั้ง log จะมีแต่บรรทัดนี้จนหาอย่างอื่นไม่เจอ
 */
let reportedOptionalServices = false

function reportOptionalServicesOnce() {
  if (reportedOptionalServices) return
  reportedOptionalServices = true

  const missing = [
    isR2Configured ? null : 'ที่เก็บไฟล์ (R2)',
    isMailConfigured ? null : 'อีเมล (Resend)',
  ].filter(Boolean)

  if (missing.length) console.warn(`[health] ยังไม่ได้ตั้งค่า: ${missing.join(', ')}`)
}

/**
 * Health check สำหรับ Railway
 *
 * คืน 503 เมื่อต่อฐานข้อมูลไม่ได้ เพื่อให้ Railway ไม่สลับ traffic มาที่ container
 * ที่ deploy ใหม่แต่ยังต่อ DB ไม่ติด
 *
 * endpoint นี้เปิดสาธารณะ (Railway ยิงมาจากนอก) จึงตอบเท่าที่ตัวตรวจสุขภาพต้องใช้เท่านั้น
 * ของเดิมบอกด้วยว่าตั้งค่าที่เก็บไฟล์กับอีเมลไว้หรือยัง และเวลาที่ฐานข้อมูลใช้ตอบ
 * ซึ่งเป็นแผนที่ให้คนที่กำลังสำรวจว่าเว็บนี้ต่ออะไรไว้บ้างและส่วนไหนยังไม่พร้อม
 * รายละเอียดพวกนั้นย้ายไปอยู่ใน log ของ container ที่มีแต่ทีมเห็น
 */
export async function GET() {
  const startedAt = Date.now()

  try {
    await db.$queryRaw`SELECT 1`
  } catch (error) {
    console.error('[health] ต่อฐานข้อมูลไม่ได้', error)
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }

  reportOptionalServicesOnce()

  // ช้าผิดปกติแปลว่าฐานข้อมูลกำลังมีปัญหา — ที่เร็วปกติไม่ต้องรายงาน ไม่งั้น log จะเต็มไปด้วยบรรทัดนี้
  const elapsed = Date.now() - startedAt
  if (elapsed > 1000) console.warn(`[health] ฐานข้อมูลตอบช้า ${elapsed}ms`)

  return NextResponse.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } })
}
