'use client'

import { FileText, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from '@/i18n/navigation'
import { Button, buttonClasses } from '@/components/ui/Button'
import { LeadForm } from '@/components/forms/LeadForm'
import {
  getSelectionServerSnapshot,
  getSelectionSnapshot,
  setSelection,
  subscribeToSelection,
} from '@/lib/rental-selection'
import { scrollIntoViewSoftly } from '@/lib/scroll'
import { EquipmentCard, type EquipmentCardData } from './EquipmentCard'

export function RentalCatalog({ items }: { items: EquipmentCardData[] }) {
  const t = useTranslations('rental')
  const tEstimate = useTranslations('estimate')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  /**
   * รายการที่เลือกอยู่นอก React (ดู src/lib/rental-selection.ts) เพราะต้องอยู่รอดข้ามการเปลี่ยนหน้า
   * useSyncExternalStore เป็นทางที่ React เตรียมไว้สำหรับค่าแบบนี้ที่มี SSR ด้วย
   * มันเรนเดอร์ด้วยค่าฝั่งเซิร์ฟเวอร์ตอน hydrate แล้วค่อยสลับมาใช้ค่าจริงในเบราว์เซอร์ให้เอง
   */
  const selectedIds = useSyncExternalStore(
    subscribeToSelection,
    getSelectionSnapshot,
    getSelectionServerSnapshot,
  )

  const toggle = (id: string) =>
    setSelection(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    )

  const selected = items.filter((item) => selectedIds.includes(item.id))

  /**
   * ฟอร์มโผล่ต่อท้ายรายการอุปกรณ์ซึ่งมักยาวเกินหนึ่งหน้าจอ
   * ถ้าไม่พาสายตาลงไปเอง ลูกค้าจะกดปุ่มแล้วเห็นหน้าจอนิ่งสนิท เหมือนกดไม่ติด
   */
  useEffect(() => {
    if (isFormOpen) scrollIntoViewSoftly(formRef.current)
  }, [isFormOpen])

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
        {t('empty')}
      </p>
    )
  }

  return (
    <>
      <ul className="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <EquipmentCard
              item={item}
              isSelected={selectedIds.includes(item.id)}
              onToggle={toggle}
            />
          </li>
        ))}
      </ul>

      {/*
        แถบสรุปลอยด้านล่าง โผล่เมื่อเลือกอุปกรณ์แล้ว
        วางไว้ล่างเพราะบนมือถือนิ้วโป้งเอื้อมถึงง่ายกว่าปุ่มด้านบน
      */}
      {selected.length > 0 && !isFormOpen && (
        <div className="sticky bottom-4 z-30 mt-10 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface/95 p-4 shadow-lift backdrop-blur-md">
          <p className="text-sm" aria-live="polite">
            {t('selectedCount', { count: selected.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelection([])}>
              {t('clearSelection')}
            </Button>
            {/*
              ใบเสนอราคาเบื้องต้นเป็นลิงก์ ไม่ใช่ปุ่มที่ต้องรอ JavaScript
              ส่งไปแค่ id แล้วให้หน้าปลายทางอ่านเรตจากฐานข้อมูลเอง ราคาจึงเป็นค่าจริงเสมอ
            */}
            <Link
              href={{
                pathname: '/rental/estimate',
                query: { items: selectedIds.join(','), days: 1 },
              }}
              className={buttonClasses('outline', 'sm')}
            >
              <FileText size={14} strokeWidth={1.75} aria-hidden />
              {tEstimate('estimateCta')}
            </Link>
            <Button variant="accent" size="sm" onClick={() => setIsFormOpen(true)}>
              {t('requestSelected')}
            </Button>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div
          ref={formRef}
          className="mt-12 scroll-mt-24 rounded-lg border border-border bg-surface p-7 md:p-9"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t('selectedCount', { count: selected.length })}
            </p>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={18} strokeWidth={1.75} aria-hidden />
              <span className="sr-only">{t('clearSelection')}</span>
            </button>
          </div>

          <LeadForm
            source="RENTAL"
            showServicePicker={false}
            equipmentIds={selected.map((item) => item.id)}
            equipmentLabels={selected.map((item) => `${item.brand} ${item.model}`)}
          />
        </div>
      )}
    </>
  )
}
