'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { cn } from '@/lib/utils'
import type { AdminActionState } from '@/server/admin-state'

/**
 * ชิ้นส่วนฟอร์มที่หน้า CMS ทุกหน้าใช้ร่วมกัน
 *
 * แนวคิด: หลีกเลี่ยงการเก็บ state ทั้งฟอร์มไว้ใน React
 * ให้ input ชื่อซ้ำกันหลายตัวแล้วอ่านด้วย formData.getAll() ฝั่ง server
 * ฟอร์มจึงยังทำงานได้แม้ JavaScript โหลดไม่ทัน และโค้ดสั้นกว่ามาก
 */

/**
 * ตราเวลาแก้ล่าสุดของระเบียนที่ฟอร์มใบนี้เรนเดอร์มา
 *
 * ส่งกลับไปกับทุกการบันทึก ฝั่ง server จะเทียบกับของจริงแล้วปฏิเสธถ้าหน้านี้เป็นภาพเก่า
 * (เปิดค้างสองแท็บ กดปุ่มย้อนกลับ หรือมีคนอื่นแก้ไปก่อน) แทนที่จะเขียนทับของใหม่เงียบ ๆ
 *
 * หลังบันทึกสำเร็จ action คืนตราเวลาใหม่มาใน state ฟอร์มจึงกดบันทึกซ้ำได้ทันทีโดยไม่ต้องรีเฟรช
 */
export function VersionField({
  initial,
  state,
}: {
  initial: string
  state: AdminActionState
}) {
  return <input type="hidden" name="expectedVersion" value={state.version ?? initial} />
}

/**
 * ให้แต่ละแถวถือ id ของตัวเอง เพื่อใช้เป็น key แทนดัชนี
 *
 * ช่องกรอกในสองคอมโพเนนต์ข้างล่างเป็นแบบ uncontrolled (ใช้ defaultValue)
 * React ไม่เขียนค่าใหม่ทับช่องที่ mount ไปแล้วเมื่อ defaultValue เปลี่ยน
 * ถ้า key เป็นดัชนี การลบแถวกลางจะทำให้ช่องที่เหลือเลื่อนดัชนีแต่ค่าใน DOM ไม่ขยับตาม
 * ผลคือลบแถวหนึ่งแต่ข้อมูลของอีกแถวหายไปแทน — id ประจำแถวตัดปัญหานี้ทั้งหมด
 */
function useRows<T>(initial: T[], blank: T) {
  const [rows, setRows] = useState(() =>
    (initial.length ? initial : [blank]).map((data, index) => ({ id: index, data })),
  )

  return {
    rows,
    add: () =>
      setRows((current) => [
        ...current,
        { id: current.reduce((max, row) => Math.max(max, row.id), -1) + 1, data: blank },
      ]),
    removeAt: (index: number) => setRows((current) => current.filter((_, i) => i !== index)),
  }
}

export function SubmitButton({
  children,
  pendingLabel = 'กำลังบันทึก',
  ...props
}: {
  children: ReactNode
  pendingLabel?: string
  variant?: 'primary' | 'accent' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

/**
 * ปุ่มทำลายข้อมูลที่ต้องกดสองจังหวะ
 *
 * ของเดิมเป็นปุ่ม submit ตรง ๆ กดพลาดครั้งเดียวข้อมูลหายถาวรพร้อมรูปทั้งชุด ไม่มีอะไรมาขวางเลย
 * กดครั้งแรกจึงแค่ง้างปุ่มไว้ ต้องกดยืนยันอีกครั้งถึงจะส่งจริง
 *
 * ปุ่มยังเป็น type="submit" เหมือนเดิม การขวางทำด้วย preventDefault ฝั่ง client
 * ถ้า JavaScript ยังโหลดไม่เสร็จ ปุ่มก็ทำงานแบบเดิมทุกประการ ไม่ได้กลายเป็นปุ่มตาย
 *
 * ตั้งใจใช้ปุ่มตัวเดิมทั้งสองสถานะ เปลี่ยนแค่ข้อความ ไม่ได้สลับเป็นปุ่มคนละตัว
 * เพราะถ้าถอดปุ่มเดิมทิ้ง โฟกัสของคนที่ใช้คีย์บอร์ดจะตกไปที่ body แล้วหลงว่าอยู่ตรงไหน
 */
export function ConfirmSubmitButton({
  children,
  question = 'ลบแล้วกู้คืนไม่ได้ แน่ใจไหม',
  confirmLabel = 'ยืนยันลบ',
  pendingLabel = 'กำลังลบ',
  variant = 'outline',
  size = 'sm',
}: {
  children: ReactNode
  question?: string
  confirmLabel?: string
  pendingLabel?: string
  variant?: 'outline' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const [armed, setArmed] = useState(false)
  const { pending } = useFormStatus()

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {armed && !pending && (
        <>
          <span className="text-xs text-muted-foreground">{question}</span>
          <Button type="button" variant="ghost" size={size} onClick={() => setArmed(false)}>
            ยกเลิก
          </Button>
        </>
      )}

      <Button
        type="submit"
        variant={variant}
        size={size}
        disabled={pending}
        className={armed ? 'border-destructive/50 text-destructive hover:bg-destructive/10' : undefined}
        onClick={(event) => {
          if (armed) return
          event.preventDefault()
          setArmed(true)
        }}
      >
        {pending ? pendingLabel : armed ? confirmLabel : children}
      </Button>
    </div>
  )
}

/**
 * รุ่นย่อสำหรับปุ่มไอคอนในกริด เช่นปุ่มลบบนรูปในคลังสื่อ ซึ่งไม่มีที่ให้วางแถวคำถาม
 * กดครั้งแรกปุ่มจะกางออกเป็นคำว่ายืนยัน กดที่อื่นหรือ tab ออกแล้วยุบกลับเอง
 */
export function ConfirmIconSubmit({ label, confirmLabel }: { label: string; confirmLabel: string }) {
  const [armed, setArmed] = useState(false)
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={armed ? confirmLabel : label}
      title={armed ? confirmLabel : label}
      onBlur={() => setArmed(false)}
      onClick={(event) => {
        if (armed) return
        event.preventDefault()
        setArmed(true)
      }}
      className={cn(
        'inline-flex h-7 items-center justify-center rounded text-[0.7rem] font-medium transition-colors disabled:opacity-50',
        armed ? 'gap-1 bg-destructive px-2 text-white' : 'w-7 bg-white/90 text-destructive',
      )}
    >
      {armed ? 'ยืนยันลบ' : <Trash2 size={13} strokeWidth={2} aria-hidden />}
    </button>
  )
}

/** สลับกรอกไทย/อังกฤษในที่เดียว — input ทั้งสองภาษาอยู่ใน DOM เสมอ แค่ซ่อนอันที่ไม่ได้เลือก */
export function BilingualTabs({
  th,
  en,
  className,
}: {
  th: ReactNode
  en: ReactNode
  className?: string
}) {
  const [locale, setLocale] = useState<'th' | 'en'>('th')

  return (
    <div className={cn('rounded-lg border border-border', className)}>
      <div className="flex border-b border-border">
        {(['th', 'en'] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            className={cn(
              'px-5 py-2.5 text-sm font-medium transition-colors',
              locale === code
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {code === 'th' ? 'ภาษาไทย' : 'English'}
          </button>
        ))}
      </div>

      <div className="p-5">
        <div hidden={locale !== 'th'} className="space-y-4">
          {th}
        </div>
        <div hidden={locale !== 'en'} className="space-y-4">
          {en}
        </div>
      </div>
    </div>
  )
}

/** รายการข้อความหลายบรรทัด เช่น จุดเด่นของบริการ หรือแท็กบทความ */
export function RepeatableInput({
  name,
  label,
  initial,
  placeholder,
  addLabel = 'เพิ่มรายการ',
}: {
  name: string
  label: string
  initial: string[]
  placeholder?: string
  addLabel?: string
}) {
  const { rows, add, removeAt } = useRows<string>(initial, '')

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex gap-2">
            <Input
              name={name}
              defaultValue={row.data}
              placeholder={placeholder}
              aria-label={`${label} รายการที่ ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={`ลบ${label}รายการที่ ${index + 1}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              <Trash2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent transition-opacity hover:opacity-80"
      >
        <Plus size={15} strokeWidth={2} />
        {addLabel}
      </button>
    </fieldset>
  )
}

/**
 * คู่ข้อความสองช่อง ใช้กับสเปกอุปกรณ์ (หัวข้อ/ค่า), FAQ (คำถาม/คำตอบ) และขั้นตอนงาน (ชื่อ/รายละเอียด)
 * ส่งออกเป็น input สองชุดชื่อ `${name}Key` และ `${name}Value` แล้วให้ฝั่ง server จับคู่ตามลำดับ
 */
export function PairInput({
  name,
  label,
  initial,
  keyPlaceholder,
  valuePlaceholder,
  valueMultiline = false,
  addLabel = 'เพิ่มรายการ',
}: {
  name: string
  label: string
  initial: { key: string; value: string }[]
  keyPlaceholder?: string
  valuePlaceholder?: string
  valueMultiline?: boolean
  addLabel?: string
}) {
  const { rows, add, removeAt } = useRows(initial, { key: '', value: '' })

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="flex gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <Input
                name={`${name}Key`}
                defaultValue={row.data.key}
                placeholder={keyPlaceholder}
                aria-label={`${label} หัวข้อรายการที่ ${index + 1}`}
              />
              {valueMultiline ? (
                <textarea
                  name={`${name}Value`}
                  defaultValue={row.data.value}
                  placeholder={valuePlaceholder}
                  aria-label={`${label} รายละเอียดรายการที่ ${index + 1}`}
                  className="min-h-[2.75rem] w-full rounded-md border border-input bg-surface px-3.5 py-2.5 text-sm transition-colors hover:border-foreground/25 focus:border-ring"
                  rows={2}
                />
              ) : (
                <Input
                  name={`${name}Value`}
                  defaultValue={row.data.value}
                  placeholder={valuePlaceholder}
                  aria-label={`${label} ค่ารายการที่ ${index + 1}`}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={`ลบ${label}รายการที่ ${index + 1}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              <Trash2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent transition-opacity hover:opacity-80"
      >
        <Plus size={15} strokeWidth={2} />
        {addLabel}
      </button>
    </fieldset>
  )
}
