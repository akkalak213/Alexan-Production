'use client'

import { Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useActionState, useEffect, useRef, useState } from 'react'
import { ServiceCategory } from '@/generated/prisma/enums'
import { Field, FormMessage, Honeypot, Input, Select, Textarea } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'
import { initialActionState } from '@/server/action-state'
import { submitReview } from '@/server/actions'
import { cn } from '@/lib/utils'

const categories = Object.values(ServiceCategory)

/** ตรงกับ reviewSchema ใน src/lib/validations.ts */
const MIN_CONTENT = 20
const MAX_CONTENT = 1500

type Draft = {
  authorName: string
  authorRole: string
  submitterEmail: string
  serviceCategory: string
  content: string
}

export function ReviewForm() {
  const t = useTranslations('forms')
  const tReviews = useTranslations('reviews')
  const tCat = useTranslations('serviceCategory')
  const locale = useLocale()
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(submitReview, initialActionState)
  const [rating, setRating] = useState(5)

  /**
   * เก็บค่าที่กรอกไว้ใน state
   * React ล้างช่องที่ไม่ได้ผูก state ทุกครั้งหลังส่งฟอร์ม ถ้าส่งไม่ผ่าน รีวิวยาว ๆ ที่พิมพ์ไว้จะหายหมด
   */
  const [draft, setDraft] = useState<Draft>({
    authorName: '',
    authorRole: '',
    submitterEmail: '',
    serviceCategory: '',
    content: '',
  })
  const setField = (name: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft({ ...draft, [name]: event.target.value })

  // ส่งไม่ผ่าน พาไปที่ช่องแรกที่ต้องแก้
  useEffect(() => {
    if (state.status === 'error') formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [state])

  // ข้อความจาก server เป็นภาษาอังกฤษของ zod — แสดงข้อความตามภาษาของหน้าแทน
  const fieldError = (name: keyof Draft) =>
    state.fieldErrors?.[name]?.length ? [t(`validation.${name}`)] : undefined

  const contentLength = draft.content.trim().length
  const contentHint =
    contentLength < MIN_CONTENT
      ? t('reviewNeedMore', { count: MIN_CONTENT - contentLength })
      : t('reviewLength', { count: contentLength })

  // แปลง messageKey ที่ action ส่งกลับมาให้เป็นข้อความตามภาษา
  // เขียนเป็น map ตายตัวเพื่อให้ TypeScript ตรวจได้ว่าคีย์มีอยู่จริงในไฟล์แปล
  const feedback: Record<string, string> = {
    rateLimited: t('rateLimited'),
    invalid: t('invalid'),
    serverError: t('serverError'),
  }

  if (state.status === 'success') {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-8 text-center">
        <p className="text-sm text-success">{t('reviewSuccess')}</p>
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <Honeypot />
      <input type="hidden" name="locale" value={locale} />
      <p className="text-sm text-muted-foreground">{t('requiredNote')}</p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          {t('rating')} <span className="text-destructive">*</span>
        </legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <label
              key={star}
              className="cursor-pointer p-1"
              title={tReviews('ratingLabel', { rating: star })}
            >
              <input
                type="radio"
                name="rating"
                value={star}
                checked={rating === star}
                onChange={() => setRating(star)}
                className="sr-only peer"
              />
              <Star
                size={28}
                aria-hidden
                className={cn(
                  'transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                  star <= rating
                    ? 'fill-accent text-accent'
                    : 'fill-transparent text-muted-foreground/35',
                )}
              />
              <span className="sr-only">{tReviews('ratingLabel', { rating: star })}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="authorName" label={t('yourName')} required error={fieldError('authorName')}>
          <Input
            id="authorName"
            name="authorName"
            value={draft.authorName}
            onChange={setField('authorName')}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            placeholder={t('namePlaceholder')}
            aria-invalid={Boolean(fieldError('authorName'))}
          />
        </Field>

        <Field htmlFor="serviceCategory" label={t('serviceUsed')} required error={fieldError('serviceCategory')}>
          <Select
            id="serviceCategory"
            name="serviceCategory"
            value={draft.serviceCategory}
            onChange={setField('serviceCategory')}
            required
            aria-invalid={Boolean(fieldError('serviceCategory'))}
          >
            <option value="" disabled>
              {t('selectService')}
            </option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {tCat(category)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="authorRole" label={t('yourRole')} error={fieldError('authorRole')}>
          <Input
            id="authorRole"
            name="authorRole"
            value={draft.authorRole}
            onChange={setField('authorRole')}
            maxLength={120}
            placeholder={t('yourRolePlaceholder')}
          />
        </Field>

        <Field
          htmlFor="submitterEmail"
          label={t('email')}
          hint={t('emailPrivateNote')}
          error={fieldError('submitterEmail')}
        >
          <Input
            id="submitterEmail"
            name="submitterEmail"
            type="email"
            value={draft.submitterEmail}
            onChange={setField('submitterEmail')}
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            aria-invalid={Boolean(fieldError('submitterEmail'))}
          />
        </Field>
      </div>

      <Field
        htmlFor="content"
        label={t('reviewContent')}
        hint={contentHint}
        required
        error={fieldError('content')}
      >
        <Textarea
          id="content"
          name="content"
          value={draft.content}
          onChange={setField('content')}
          required
          minLength={MIN_CONTENT}
          maxLength={MAX_CONTENT}
          placeholder={t('reviewContentPlaceholder')}
          aria-invalid={Boolean(fieldError('content'))}
        />
      </Field>

      {state.status === 'error' && (
        <FormMessage status="error">
          {feedback[state.messageKey ?? 'serverError'] ?? t('serverError')}
        </FormMessage>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? t('sending') : t('submitReview')}
        </Button>
        <p className="text-xs text-muted-foreground">{tReviews('formNote')}</p>
      </div>
    </form>
  )
}
