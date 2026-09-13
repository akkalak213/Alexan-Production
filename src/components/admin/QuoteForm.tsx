'use client'

import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { QuoteStatus } from '@/generated/prisma/enums'
import { AdminCard } from '@/components/admin/AdminPage'
import { useActionToast } from '@/components/ui/Toast'
import {
  ConfirmSubmitButton,
  SubmitButton,
  VersionField,
} from '@/components/admin/AdminUI'
import { buttonClasses } from '@/components/ui/Button'
import { Field, FormMessage, Input, Select, Textarea } from '@/components/ui/Form'
import { quoteStatusLabels } from '@/lib/admin-labels'
import { bahtText } from '@/lib/baht-text'
import { computeQuoteTotals, lineAmount } from '@/lib/quote-math'
import { initialAdminState } from '@/server/admin-state'
import { deleteQuote, saveQuote } from '@/server/quote-actions'

export type QuoteLineRow = {
  description: string
  quantity: string
  unit: string
  unitPrice: string
}

export type QuoteFormData = {
  id: string
  leadId: string
  leadRefCode: string
  quoteNumber: string
  /** เวลาแก้ล่าสุด ใช้กันบันทึกทับข้อมูลที่ใหม่กว่า — ใบใหม่เป็นข้อความว่าง */
  version: string
  customerName: string
  customerCompany: string
  customerAddress: string
  customerTaxId: string
  customerEmail: string
  customerPhone: string
  locale: string
  validUntil: string
  discount: string
  vatRate: string
  withholdingRate: string
  notes: string
  termsText: string
  status: QuoteStatus
  items: QuoteLineRow[]
}

const blankLine: QuoteLineRow = { description: '', quantity: '1', unit: 'งาน', unitPrice: '' }

const money = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function QuoteForm({ quote }: { quote: QuoteFormData }) {
  const [state, formAction] = useActionState(saveQuote, initialAdminState)

  useActionToast(state)
  const [lines, setLines] = useState<QuoteLineRow[]>(quote.items.length ? quote.items : [blankLine])
  const [discount, setDiscount] = useState(quote.discount)
  const [vatRate, setVatRate] = useState(quote.vatRate)
  const [withholdingRate, setWithholdingRate] = useState(quote.withholdingRate)

  const isEditing = Boolean(quote.id)

  // คำนวณสด ๆ ด้วยสูตรเดียวกับฝั่ง server เพื่อไม่ให้ตัวเลขบนจอต่างจากที่บันทึกจริง
  const totals = useMemo(
    () =>
      computeQuoteTotals({
        lines: lines.map((line) => ({ quantity: line.quantity, unitPrice: line.unitPrice })),
        discount,
        vatRate,
        withholdingRate,
      }),
    [lines, discount, vatRate, withholdingRate],
  )

  const update = (index: number, patch: Partial<QuoteLineRow>) =>
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        {isEditing && <input type="hidden" name="id" value={quote.id} />}
        {isEditing && <VersionField initial={quote.version} state={state} />}
        {quote.leadId && <input type="hidden" name="leadId" value={quote.leadId} />}

        <AdminCard title="ข้อมูลลูกค้า">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="customerName" label="ชื่อลูกค้า" required>
              <Input id="customerName" name="customerName" required defaultValue={quote.customerName} />
            </Field>
            <Field htmlFor="customerCompany" label="บริษัท">
              <Input id="customerCompany" name="customerCompany" defaultValue={quote.customerCompany} />
            </Field>
            <Field htmlFor="customerEmail" label="อีเมล" required>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                required
                defaultValue={quote.customerEmail}
              />
            </Field>
            <Field htmlFor="customerPhone" label="เบอร์โทร">
              <Input id="customerPhone" name="customerPhone" defaultValue={quote.customerPhone} />
            </Field>
            <Field htmlFor="customerTaxId" label="เลขประจำตัวผู้เสียภาษี">
              <Input id="customerTaxId" name="customerTaxId" defaultValue={quote.customerTaxId} />
            </Field>
            <Field htmlFor="locale" label="ภาษาในเอกสาร">
              <Select id="locale" name="locale" defaultValue={quote.locale}>
                <option value="th">ไทย</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field htmlFor="customerAddress" label="ที่อยู่สำหรับออกเอกสาร" className="sm:col-span-2">
              <Textarea
                id="customerAddress"
                name="customerAddress"
                defaultValue={quote.customerAddress}
                className="min-h-20"
              />
            </Field>
          </div>
        </AdminCard>

        <AdminCard title="รายการ">
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="rounded-md border border-border p-3">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Textarea
                      name="itemDescription"
                      value={line.description}
                      onChange={(e) => update(index, { description: e.target.value })}
                      placeholder="รายละเอียดงาน เช่น ถ่ายภาพสินค้า 40 ชิ้น พร้อมรีทัช"
                      aria-label={`รายละเอียดรายการที่ ${index + 1}`}
                      className="min-h-[3.25rem] text-sm"
                      rows={2}
                    />
                    <div className="grid gap-2 sm:grid-cols-4">
                      <Input
                        name="itemQuantity"
                        value={line.quantity}
                        onChange={(e) => update(index, { quantity: e.target.value })}
                        inputMode="decimal"
                        aria-label={`จำนวนรายการที่ ${index + 1}`}
                        placeholder="จำนวน"
                      />
                      <Input
                        name="itemUnit"
                        value={line.unit}
                        onChange={(e) => update(index, { unit: e.target.value })}
                        aria-label={`หน่วยรายการที่ ${index + 1}`}
                        placeholder="หน่วย"
                      />
                      <Input
                        name="itemUnitPrice"
                        value={line.unitPrice}
                        onChange={(e) => update(index, { unitPrice: e.target.value })}
                        inputMode="decimal"
                        aria-label={`ราคาต่อหน่วยรายการที่ ${index + 1}`}
                        placeholder="ราคา/หน่วย"
                      />
                      <p className="tabular flex items-center justify-end px-2 text-sm font-medium">
                        {money.format(
                          lineAmount({ quantity: line.quantity, unitPrice: line.unitPrice }),
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((rows) => rows.filter((_, i) => i !== index))}
                    aria-label={`ลบรายการที่ ${index + 1}`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLines((rows) => [...rows, blankLine])}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent transition-opacity hover:opacity-80"
          >
            <Plus size={15} strokeWidth={2} />
            เพิ่มรายการ
          </button>
        </AdminCard>

        <AdminCard title="ยอดรวม">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Field htmlFor="discount" label="ส่วนลด (บาท)">
                <Input
                  id="discount"
                  name="discount"
                  inputMode="decimal"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </Field>
              <Field htmlFor="vatRate" label="VAT (%)">
                <Input
                  id="vatRate"
                  name="vatRate"
                  inputMode="decimal"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                />
              </Field>
              <Field
                htmlFor="withholdingRate"
                label="หัก ณ ที่จ่าย (%)"
                hint="ค่าบริการทั่วไปคิด 3% ใส่ 0 ถ้าไม่หัก"
              >
                <Input
                  id="withholdingRate"
                  name="withholdingRate"
                  inputMode="decimal"
                  value={withholdingRate}
                  onChange={(e) => setWithholdingRate(e.target.value)}
                />
              </Field>
            </div>

            <dl className="tabular space-y-2.5 self-start rounded-md bg-subtle p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">รวมเป็นเงิน</dt>
                <dd>{money.format(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">หักส่วนลด</dt>
                  <dd>−{money.format(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2.5">
                <dt className="text-muted-foreground">ยอดก่อนภาษี</dt>
                <dd>{money.format(totals.afterDiscount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT {vatRate || 0}%</dt>
                <dd>{money.format(totals.vatAmount)}</dd>
              </div>
              {totals.withholdingAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">หัก ณ ที่จ่าย {withholdingRate}%</dt>
                  <dd>−{money.format(totals.withholdingAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2.5 text-base font-semibold">
                <dt>ยอดชำระสุทธิ</dt>
                <dd>{money.format(totals.total)}</dd>
              </div>
              <p className="border-t border-border pt-2.5 text-xs text-muted-foreground">
                ({bahtText(totals.total)})
              </p>
            </dl>
          </div>
        </AdminCard>

        <AdminCard title="เงื่อนไขและสถานะ">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="validUntil" label="ยืนราคาถึงวันที่">
              <Input id="validUntil" name="validUntil" type="date" defaultValue={quote.validUntil} />
            </Field>
            <Field htmlFor="status" label="สถานะ">
              <Select id="status" name="status" defaultValue={quote.status}>
                {Object.values(QuoteStatus).map((status) => (
                  <option key={status} value={status}>
                    {quoteStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="notes" label="หมายเหตุ" className="sm:col-span-2">
              <Textarea id="notes" name="notes" defaultValue={quote.notes} className="min-h-20" />
            </Field>
            <Field
              htmlFor="termsText"
              label="เงื่อนไข"
              hint="ขึ้นบรรทัดใหม่ = ข้อใหม่ ค่าตั้งต้นแก้ได้ที่หน้าข้อมูลบริษัท"
              className="sm:col-span-2"
            >
              <Textarea
                id="termsText"
                name="termsText"
                defaultValue={quote.termsText}
                className="min-h-28 text-xs"
              />
            </Field>
          </div>
        </AdminCard>

        {state.message && (
          <FormMessage status={state.status === 'error' ? 'error' : 'success'}>
            {state.message}
          </FormMessage>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="lg">{isEditing ? 'บันทึกการแก้ไข' : 'สร้างใบเสนอราคา'}</SubmitButton>
          <Link href="/admin/quotes" className={buttonClasses('ghost', 'lg')}>
            ยกเลิก
          </Link>
        </div>
      </form>

      {isEditing && (
        <form
          action={deleteQuote}
          className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5"
        >
          <input type="hidden" name="id" value={quote.id} />
          <div>
            <p className="text-sm font-medium">ลบใบเสนอราคา {quote.quoteNumber}</p>
            <p className="text-xs text-muted-foreground">ลบแล้วเลขที่นี้จะไม่ถูกนำกลับมาใช้ซ้ำ</p>
          </div>
          <ConfirmSubmitButton variant="outline" size="sm" pendingLabel="กำลังลบ">
            ลบถาวร
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  )
}
