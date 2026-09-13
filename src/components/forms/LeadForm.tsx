'use client'

import { Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ServiceCategory } from '@/generated/prisma/enums'
import { Button } from '@/components/ui/Button'
import { Field, FormMessage, Honeypot, Input, Select, Textarea } from '@/components/ui/Form'
import { bangkokDateString } from '@/lib/bangkok-time'
import { cn } from '@/lib/utils'
import { budgetRanges } from '@/lib/lead-options'
import {
  addDaysIso,
  isIsoDate,
  MAX_ADVANCE_DAYS,
  MAX_RENTAL_DAYS,
  parseRentalDays,
  rentalEndDate,
  rentalRequestEstimate,
  type RentalRateItem,
} from '@/lib/rental-request'
import { initialActionState } from '@/server/action-state'
import { submitLead } from '@/server/actions'
import { usePackageSelection, type SelectedPackage } from '@/components/services/PackageSelection'

const categories = Object.values(ServiceCategory)

type Props = {
  source?: 'CONTACT' | 'QUOTE' | 'RENTAL' | 'SERVICE_PAGE'
  /** ติ๊กบริการไว้ล่วงหน้าเมื่อมาจากหน้าบริการใดบริการหนึ่ง */
  defaultService?: ServiceCategory
  /**
   * อุปกรณ์ที่ลูกค้าเลือกมา พร้อมเรต ใช้คำนวณค่าเช่าโดยประมาณให้เห็นก่อนกดส่ง
   * days คือจำนวนวันที่เลือกมาจากใบเสนอราคาเบื้องต้น ถ้ามี
   */
  rental?: { items: RentalRateItem[]; days?: number }
  showServicePicker?: boolean
  /**
   * แพ็กเกจที่ลูกค้ากดมาจากหน้าบริการ ส่งมาจากฝั่งเซิร์ฟเวอร์ผ่าน URL
   * ทำให้ใช้งานได้โดยไม่ต้องพึ่ง JavaScript ฝั่งหน้าบริการเลย
   */
  initialPackage?: SelectedPackage | null
}

type Draft = {
  name: string
  email: string
  phone: string
  company: string
  message: string
  startDate: string
  rentalDays: string
}

export function LeadForm({
  source = 'CONTACT',
  defaultService,
  rental,
  showServicePicker = true,
  initialPackage = null,
}: Props) {
  const t = useTranslations('forms')
  const tCat = useTranslations('serviceCategory')
  const tBudget = useTranslations('budget')
  const locale = useLocale()
  const formId = useId()
  const fieldId = (name: string) => formId + '-' + name
  const formRef = useRef<HTMLFormElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<Draft>({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    startDate: '',
    rentalDays: String(rental?.days ?? 1),
  })
  const [chosenServices, setChosenServices] = useState<ServiceCategory[]>(defaultService ? [defaultService] : [])

  const [state, formAction, isPending] = useActionState(submitLead, initialActionState)

  const isRental = Boolean(rental?.items.length)
  const isThai = locale === 'th'
  const days = parseRentalDays(draft.rentalDays)

  /**
   * ค่าเช่าโดยประมาณคิดใหม่ทุกครั้งที่เปลี่ยนจำนวนวัน ด้วยสูตรเดียวกับใบเสนอราคาเบื้องต้น
   * เดิมฟอร์มเช่าไม่มีช่องวันเลย ทีมขายต้องถามกลับทุกรายว่าจะใช้กี่วัน ก่อนจะคิดราคาได้
   */
  const estimate = useMemo(
    () => (rental?.items.length ? rentalRequestEstimate(rental.items, days) : null),
    [rental, days],
  )
  const money = useMemo(
    () => new Intl.NumberFormat(isThai ? 'th-TH' : 'en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }),
    [isThai],
  )

  // วันนี้ตามเวลาไทย ฝั่งเซิร์ฟเวอร์กับเบราว์เซอร์จึงได้ค่าเดียวกันตอน hydrate
  const today = bangkokDateString()
  const returnText = isIsoDate(draft.startDate)
    ? t('returnOn', {
        date: new Intl.DateTimeFormat(isThai ? 'th-TH' : 'en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(
          new Date(`${rentalEndDate(draft.startDate, days)}T00:00:00Z`),
        ),
      })
    : undefined

  /**
   * แพ็กเกจมาได้สองทาง
   *   1. ส่งมาจากฝั่งเซิร์ฟเวอร์ผ่าน URL (?package=...) — ทางหลักที่ใช้อยู่
   *   2. กดเลือกในหน้าเดียวกันผ่าน store — สำรองไว้เผื่อหน้าบริการกลับมาใช้งานได้
   */
  const { selected: storePackage, clear: clearStorePackage } = usePackageSelection()
  const [dismissed, setDismissed] = useState(false)
  const selectedPackage = dismissed ? null : (storePackage ?? initialPackage)

  const clearPackage = () => {
    setDismissed(true)
    clearStorePackage()
  }

  /**
   * ช่องงบประมาณเป็น controlled เพราะต้องเติมตามแพ็กเกจที่เลือกมา
   * ผู้ใช้ยังเปลี่ยนเองได้ และถ้าเปลี่ยนแพ็กเกจจะทับค่าเดิมให้
   *
   * ปรับค่าระหว่างเรนเดอร์เมื่อแพ็กเกจเปลี่ยน แทนการเซ็ตใน useEffect
   * เพราะแบบหลังทำให้เรนเดอร์สองรอบและผู้ใช้เห็นค่าเก่าแวบหนึ่งก่อน
   */
  const [budget, setBudget] = useState(initialPackage?.budgetRange ?? '')
  const [syncedPackageId, setSyncedPackageId] = useState<string | null>(
    initialPackage?.id ?? null,
  )

  if (selectedPackage && selectedPackage.id !== syncedPackageId) {
    setSyncedPackageId(selectedPackage.id)
    if (selectedPackage.budgetRange) setBudget(selectedPackage.budgetRange)
  }

  useEffect(() => {
    if (state.status === 'success') resultRef.current?.focus()
    if (state.status === 'error') {
      const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-form-error]')
      target?.focus()
    }
  }, [state])

  const fieldError = (name: keyof Draft) =>
    state.fieldErrors?.[name]?.length ? [t('validation.' + name)] : undefined
  const feedback: Record<string, string> = {
    rateLimited: t('rateLimited'),
    invalid: t('invalid'),
    serverError: t('serverError'),
  }
  const setField = (name: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft({ ...draft, [name]: event.target.value })

  if (state.status === 'success') {
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="rounded-lg border border-success/30 bg-success/10 p-8">
        <p className="text-sm text-success">{t('leadSuccess')}</p>
        {state.refCode && (
          <p className="tabular mt-2 text-sm font-medium text-success">
            {t('leadSuccessRef', { refCode: state.refCode })}
          </p>
        )}
        {state.receiptSent && draft.email && (
          <p className="mt-3 text-sm text-muted-foreground text-pretty">
            {t('leadCopySent', { email: draft.email })}
          </p>
        )}
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} aria-busy={isPending} className="space-y-5">
      <p className="text-sm text-muted-foreground">{t('requiredNote')}</p>
      <p role="status" className="sr-only">{isPending ? t('sending') : ''}</p>
      <Honeypot />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />
      {rental?.items.map((item) => (
        <input key={item.id} type="hidden" name="equipmentIds" value={item.id} />
      ))}

      {/*
        แพ็กเกจที่กดเลือกมาจากด้านบนของหน้า
        แสดงเป็นสรุปให้เห็นชัดว่าเลือกอะไรไว้ ไม่ใช่ข้อความที่แอบเติมลงช่องข้อความ
        และส่งชื่อกับราคาไปกับคำขอ ทีมขายจึงรู้ทันทีว่าลูกค้าสนใจแพ็กเกจไหนที่ราคาเท่าไหร่
      */}
      {selectedPackage && (
        <>
          <input type="hidden" name="packageId" value={selectedPackage.id} />
          <input type="hidden" name="packageName" value={selectedPackage.name} />
          <input type="hidden" name="packagePriceTag" value={selectedPackage.priceTag} />

          <div className="flex items-start justify-between gap-4 rounded-md border border-accent/40 bg-accent-subtle p-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-accent">
                {t('selectedPackage')}
              </p>
              <p className="mt-1.5 font-medium">
                {selectedPackage.serviceName} · {selectedPackage.name}
              </p>
              <p className="tabular mt-0.5 text-sm text-muted-foreground">
                {selectedPackage.priceTag}
              </p>
            </div>
            <button
              type="button"
              onClick={clearPackage}
              className="min-h-11 shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
            >
              {t('removePackage')}
            </button>
          </div>
        </>
      )}

      {estimate && (
        <div className="rounded-md border border-border bg-subtle p-4">
          <p className="mb-2 text-sm font-medium">{t('selectedEquipment')}</p>
          <ul className="divide-y divide-border text-sm">
            {estimate.lines.map((line) => (
              <li key={line.id} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 text-pretty">{line.label}</span>
                <span className="tabular shrink-0 text-muted-foreground">
                  {line.isOnRequest ? t('onRequest') : money.format(line.amount)}
                </span>
              </li>
            ))}
          </ul>
          <dl aria-live="polite" className="mt-2 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex items-baseline justify-between gap-3 font-medium">
              <dt>
                {t('rentalEstimate')} · {t('daysCount', { count: days })}
              </dt>
              <dd className="tabular">{money.format(estimate.subtotal)}</dd>
            </div>
            {estimate.deposit > 0 && (
              <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
                <dt>{t('deposit')}</dt>
                <dd className="tabular">{money.format(estimate.deposit)}</dd>
              </div>
            )}
          </dl>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground text-pretty">{t('rentalEstimateNote')}</p>
        </div>
      )}

      {isRental && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            htmlFor={fieldId('startDate')}
            label={t('startDate')}
            optionalLabel={t('optional')}
            hint={returnText}
            error={fieldError('startDate')}
          >
            <Input
              id={fieldId('startDate')}
              name="startDate"
              type="date"
              min={today}
              max={addDaysIso(today, MAX_ADVANCE_DAYS)}
              value={draft.startDate}
              onChange={setField('startDate')}
              aria-invalid={Boolean(fieldError('startDate'))}
            />
          </Field>

          <Field htmlFor={fieldId('rentalDays')} label={t('rentalDays')} required error={fieldError('rentalDays')}>
            <Input
              id={fieldId('rentalDays')}
              name="rentalDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_RENTAL_DAYS}
              step={1}
              required
              value={draft.rentalDays}
              onChange={setField('rentalDays')}
              aria-invalid={Boolean(fieldError('rentalDays'))}
            />
          </Field>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor={fieldId('name')} label={t('name')} required error={fieldError('name')}>
          <Input
            id={fieldId('name')}
            name="name"
            value={draft.name}
            onChange={setField('name')}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder={t('namePlaceholder')}
            aria-invalid={Boolean(fieldError('name'))}
          />
        </Field>

        <Field htmlFor={fieldId('email')} label={t('email')} required error={fieldError('email')}>
          <Input
            id={fieldId('email')}
            name="email"
            value={draft.email}
            onChange={setField('email')}
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            aria-invalid={Boolean(fieldError('email'))}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor={fieldId('phone')} label={t('phone')} error={fieldError('phone')}>
          <Input
            id={fieldId('phone')}
            name="phone"
            value={draft.phone}
            onChange={setField('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('phonePlaceholder')}
            aria-invalid={Boolean(fieldError('phone'))}
          />
        </Field>

        <Field htmlFor={fieldId('company')} label={t('company')} error={fieldError('company')}>
          <Input
            id={fieldId('company')}
            name="company"
            value={draft.company}
            onChange={setField('company')}
            maxLength={120}
            autoComplete="organization"
            placeholder={t('companyPlaceholder')}
          />
        </Field>
      </div>

      {/* คำขอเช่าไม่ถามบริการกับงบประมาณ อุปกรณ์และจำนวนวันบอกราคาได้ชัดกว่าช่วงงบอยู่แล้ว */}
      {showServicePicker && !isRental && (
        <fieldset>
          <legend className="mb-2.5 text-sm font-medium">{t('servicesInterested')}</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              // ชิปทั้งใบเป็นพื้นที่กดได้ ไม่ใช่แค่ช่องติ๊กเล็ก ๆ
              // เพิ่มเครื่องหมายถูกตอนเลือกเพื่อให้เห็นชัดว่ากดได้และกดไปแล้ว
              <label
                key={category}
                className={cn(
                  'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-input min-h-11 py-1.5 pl-3 pr-3.5 text-sm text-muted-foreground',
                  'transition-colors hover:border-foreground/25 hover:bg-muted',
                  'has-[:checked]:border-accent has-[:checked]:bg-accent-subtle has-[:checked]:text-accent',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
                )}
              >
                <input
                  type="checkbox"
                  name="services"
                  value={category}
                  checked={chosenServices.includes(category)}
                  onChange={(event) => setChosenServices(event.target.checked ? [...chosenServices, category] : chosenServices.filter((value) => value !== category))}
                  className="peer sr-only"
                />
                <Check
                  size={14}
                  strokeWidth={2.5}
                  aria-hidden
                  className="opacity-0 transition-opacity peer-checked:opacity-100"
                />
                {tCat(category)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {!isRental && (
        <Field htmlFor={fieldId('budgetRange')} label={t('budget')}>
          <Select
            id={fieldId('budgetRange')}
            name="budgetRange"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          >
            <option value="">{t('budgetPlaceholder')}</option>
            {budgetRanges.map((range) => (
              <option key={range} value={range}>
                {tBudget(range)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field
        htmlFor={fieldId('message')}
        label={isRental ? t('rentalMessage') : t('message')}
        hint={isRental ? undefined : t('messageHint')}
        required={!isRental}
        optionalLabel={isRental ? t('optional') : undefined}
        error={fieldError('message')}
      >
        <Textarea
          id={fieldId('message')}
          name="message"
          value={draft.message}
          onChange={setField('message')}
          required={!isRental}
          minLength={isRental ? undefined : 10}
          maxLength={3000}
          placeholder={isRental ? t('rentalMessagePlaceholder') : t('messagePlaceholder')}
          aria-invalid={Boolean(fieldError('message'))}
          className={isRental ? 'min-h-24' : undefined}
        />
      </Field>

      {state.status === 'error' && (
        <div data-form-error tabIndex={-1}><FormMessage status="error">
          {feedback[state.messageKey ?? 'serverError'] ?? t('serverError')}
        </FormMessage></div>
      )}

      <Button type="submit" size="lg" variant="accent" disabled={isPending}>
        {isPending ? t('sending') : t('submitLead')}
      </Button>
    </form>
  )
}
