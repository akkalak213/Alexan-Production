'use client'

import { ArrowRight, Check, Plus } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { EquipmentCategory, EquipmentStatus } from '@/generated/prisma/enums'
import { Link } from '@/i18n/navigation'
import { equipmentBrand, equipmentName } from '@/lib/format'
import { cn } from '@/lib/utils'

export type EquipmentCardData = {
  id: string
  slug: string
  category: EquipmentCategory
  brand: string
  model: string
  name: string
  description: string | null
  specs: { label: string; value: string }[]
  /** จัดรูปแบบสกุลเงินมาจากฝั่งเซิร์ฟเวอร์แล้ว เพื่อไม่ให้ Decimal ของ Prisma หลุดมาถึง client */
  dailyRateLabel: string | null
  weeklyRateLabel: string | null
  depositLabel: string | null
  /** เรตเป็นตัวเลขสำหรับคำนวณค่าเช่าโดยประมาณในฟอร์มขอใบเสนอราคา */
  dailyRate: number | null
  weeklyRate: number | null
  deposit: number | null
  image: string | null
  gallery: string[]
  quantity: number
  status: EquipmentStatus
}

type Props = {
  item: EquipmentCardData
  isSelected: boolean
  onToggle: (id: string) => void
}

export function EquipmentCard({ item, isSelected, onToggle }: Props) {
  const t = useTranslations('rental')
  const isAvailable = item.status === 'AVAILABLE'

  return (
    <article
      className={cn(
        'equipment-card group relative flex h-full flex-col overflow-hidden rounded-lg border bg-surface transition-colors',
        isSelected ? 'border-accent' : 'border-border hover:border-foreground/20',
      )}
    >
      {/*
        รูปสินค้าวางบนพื้นสีกระดาษแบบไม่ตัดขอบ (contain) ทั้งตัวกล้องและขาตั้งจึงเห็นครบทุกชิ้น
        รูปส่วนใหญ่ถ่ายบนพื้นขาว multiply ทำให้พื้นขาวกลืนไปกับพื้นกล่อง ไม่เห็นเป็นสี่เหลี่ยมขาวซ้อนอยู่
      */}
      <div className="equipment-card-image relative aspect-[4/3] overflow-hidden">
        {item.image && (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain"
          />
        )}
        {!isAvailable && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {t(`status.${item.status}`)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {equipmentBrand(item.brand) && (
          <p className="text-[0.8125rem] uppercase tracking-wider text-muted-foreground">
            {equipmentBrand(item.brand)}
          </p>
        )}
        <h3 className="mt-1 font-display text-xl text-balance transition-colors group-hover:text-accent">
          {item.model}
        </h3>

        {item.specs.length > 0 && (
          <dl className="mt-4 space-y-1.5 text-[0.8125rem] leading-relaxed">
            {item.specs.slice(0, 3).map((spec, index) => (
              <div key={index} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{spec.label}</dt>
                <dd className="text-right font-medium">{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {/*
          ป้ายบอกว่าการ์ดกดได้ แสดงตลอดเวลาไม่ใช่เฉพาะตอนเอาเมาส์ชี้
          เพราะบนมือถือไม่มีสถานะ hover ให้เห็น ลูกค้าจึงไม่รู้เลยว่ากดเข้าไปดูต่อได้
        */}
        <p className="mb-5 mt-4 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-accent">
          {t('viewDetails')}
          <ArrowRight
            size={13}
            strokeWidth={2}
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </p>

        {/* mt-auto ดันแถวราคาลงไปชิดขอบล่างทุกใบ การ์ดที่สเปกน้อยจึงไม่มีช่องว่างค้างอยู่ใต้ราคา */}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            {item.dailyRateLabel ? (
              <p className="tabular font-display text-xl">
                {item.dailyRateLabel}
                <span className="ml-1 font-sans text-[0.8125rem] text-muted-foreground">{t('perDay')}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {item.depositLabel && (
              <p className="tabular mt-0.5 text-[0.8125rem] text-muted-foreground">
                {t('deposit')} {item.depositLabel}
              </p>
            )}
          </div>

          {/* z-10 ยกปุ่มนี้ขึ้นเหนือแผ่นกดของทั้งการ์ด ไม่งั้นจะโดนกลืนไปเปิดหน้ารายละเอียดแทน */}
          <button
            type="button"
            onClick={() => onToggle(item.id)}
            aria-pressed={isSelected}
            className={cn(
              'relative z-10 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[0.8125rem] font-medium transition-colors',
              isSelected
                ? 'bg-accent text-accent-foreground'
                : 'border border-input text-foreground hover:border-foreground/25 hover:bg-muted',
            )}
          >
            {isSelected ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2} />}
            {isSelected ? t('selected') : t('select')}
          </button>
        </div>
      </div>

      {/*
        แผ่นกดคลุมทั้งการ์ด — ทำให้ทั้งใบเป็นพื้นที่กดได้โดยไม่ต้องซ้อนปุ่มในปุ่ม
        (ปุ่มซ้อนปุ่มเป็น HTML ที่ไม่ถูกต้อง และคีย์บอร์ดกับ screen reader จะสับสน)

        เดิมเป็นปุ่มที่เปิดกล่องซ้อน เปลี่ยนเป็นลิงก์จริงไปหน้าของอุปกรณ์ชิ้นนั้น
        ได้สามอย่างที่กล่องซ้อนให้ไม่ได้: Google มี URL ให้จัดอันดับ, ส่งลิงก์ให้ลูกค้าดูของชิ้นเดียวได้
        และคลิกขวาเปิดแท็บใหม่เพื่อเทียบหลายชิ้นพร้อมกันได้
      */}
      <Link
        href={`/rental/${item.slug}`}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="sr-only">
          {t('openDetails', { name: equipmentName(item.brand, item.model) })}
        </span>
      </Link>
    </article>
  )
}
