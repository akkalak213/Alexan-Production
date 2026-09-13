'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * คำนวณเรตค่าเช่าให้ดูระหว่างกรอก
 *
 * เรตสัปดาห์ที่สูงกว่ารายวันคูณเจ็ดเคยเกิดจากการกรอกพลาด ระบบคิดราคาเลือกแบบที่ถูกกว่าให้ลูกค้าอยู่แล้ว
 * แต่แอดมินไม่รู้ตัวว่าเรตสัปดาห์ที่ตั้งไว้ไม่เคยถูกใช้ ที่นี่บอกให้เห็นตั้งแต่ตอนพิมพ์
 */

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[,฿\s]/g, '')
  if (!cleaned) return null
  const amount = Number(cleaned)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

const baht = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })

export function RateHint({ dailyName = 'dailyRate', weeklyName = 'weeklyRate' }: { dailyName?: string; weeklyName?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [rates, setRates] = useState({ daily: '', weekly: '' })

  useEffect(() => {
    const form = ref.current?.closest('form')
    if (!form) return

    const valueOf = (name: string) => {
      const field = form.elements.namedItem(name)
      return field instanceof HTMLInputElement ? field.value : ''
    }
    const read = () => setRates({ daily: valueOf(dailyName), weekly: valueOf(weeklyName) })

    read()
    form.addEventListener('input', read)
    return () => form.removeEventListener('input', read)
  }, [dailyName, weeklyName])

  const daily = parseAmount(rates.daily)
  const weekly = parseAmount(rates.weekly)

  let message = 'เว้นค่าเช่าต่อวันว่างไว้ = ไม่แสดงราคาบนหน้าเว็บ ลูกค้าต้องสอบถาม'
  let isWarning = false

  if (daily !== null && daily > 0) {
    const sevenDays = daily * 7
    if (weekly === null) {
      message = `เช่า 7 วันคิดรายวันเป็น ${baht.format(sevenDays)} ตั้งเรตสัปดาห์ให้ต่ำกว่านี้ถ้าอยากให้เช่ายาวคุ้มกว่า`
    } else if (weekly >= sevenDays) {
      isWarning = true
      message = `เรตสัปดาห์ ${baht.format(weekly)} ไม่ถูกกว่าเช่ารายวัน 7 วัน (${baht.format(sevenDays)}) ระบบจะคิดรายวันให้ลูกค้าแทน เรตสัปดาห์นี้จึงไม่ถูกใช้`
    } else {
      const saving = Math.round((1 - weekly / sevenDays) * 100)
      message = `เช่าครบสัปดาห์ถูกกว่ารายวัน ${baht.format(sevenDays - weekly)} (ลด ${saving}%) เฉลี่ยวันละ ${baht.format(weekly / 7)}`
    }
  }

  return (
    <p ref={ref} aria-live="polite" className={cn('mt-3 text-xs', isWarning ? 'text-warning' : 'text-muted-foreground')}>
      {message}
    </p>
  )
}
