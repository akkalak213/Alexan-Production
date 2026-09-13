'use client'

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { Input } from '@/components/ui/Form'
import { uploadImage } from '@/lib/upload-client'
import { cn } from '@/lib/utils'
import { INVALID_EVENT } from './admin-form-context'

/**
 * ช่องรูปที่อัปโหลดขึ้น R2 ได้จริง
 *
 * ค่าที่ส่งไปกับฟอร์มยังเป็น URL ข้อความเหมือนเดิม (hidden input)
 * ทีมจึงยังวาง URL จากที่อื่นได้ถ้าต้องการ ไม่ได้บังคับให้อัปโหลดอย่างเดียว
 */

function useUploader(folder: string) {
  const [isUploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (files: FileList | null, onDone: (urls: string[]) => void) => {
    if (!files?.length) return

    setUploading(true)
    setError(null)

    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      const result = await uploadImage(file, folder)
      if (result.ok) uploaded.push(result.url)
      else setError(result.error)
    }

    if (uploaded.length) onDone(uploaded)
    setUploading(false)
  }

  return { isUploading, error, upload }
}

export function ImageField({
  name,
  label,
  initial,
  folder = 'uploads',
  required,
  hint,
}: {
  name: string
  label: string
  initial: string
  folder?: string
  required?: boolean
  hint?: string
}) {
  const id = useId()
  const [url, setUrlState] = useState(initial)
  const [missing, setMissing] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLInputElement>(null)
  const { isUploading, error, upload } = useUploader(folder)

  const setUrl = (next: string) => {
    setUrlState(next)
    if (next) setMissing(null)
  }

  // AdminForm แจ้งมาเมื่อกดบันทึกโดยยังไม่ได้ใส่รูปที่จำเป็น — ขึ้นข้อความตรงช่องนี้ ไม่ใช่ท้ายฟอร์ม
  useEffect(() => {
    const field = valueRef.current
    if (!field) return

    const onInvalid = (event: Event) =>
      setMissing((event as CustomEvent<string | undefined>).detail ?? `ต้องใส่${label}ก่อนบันทึก`)

    field.addEventListener(INVALID_EVENT, onInvalid)
    return () => field.removeEventListener(INVALID_EVENT, onInvalid)
  }, [label])

  return (
    <fieldset data-field={name}>
      <legend className="mb-2 text-sm font-medium">
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden>
            *
          </span>
        )}
      </legend>

      <input ref={valueRef} type="hidden" name={name} value={url} required={required} data-label={label} />

      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            'relative h-24 w-32 shrink-0 overflow-hidden rounded-md border bg-subtle',
            missing ? 'border-destructive' : 'border-border',
          )}
        >
          {url ? (
            <Image src={url} alt="" fill sizes="128px" className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <ImagePlus size={20} strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-56 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm transition-colors hover:border-foreground/25 hover:bg-muted disabled:opacity-60"
            >
              {isUploading ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Upload size={14} strokeWidth={1.75} aria-hidden />
              )}
              {isUploading ? 'กำลังอัปโหลด' : 'อัปโหลดรูป'}
            </button>

            {url && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                เอาออก
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              upload(event.target.files, (urls) => setUrl(urls[0]))
              event.target.value = ''
            }}
          />

          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="หรือวาง URL รูปเอง"
            aria-label={`${label} — URL`}
            className="text-xs"
          />

          {error || missing ? (
            <p role="alert" className="text-xs text-destructive">
              {error ?? missing}
            </p>
          ) : (
            hint && <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
    </fieldset>
  )
}

export function ImageListField({
  name,
  label,
  initial,
  folder = 'uploads',
  hint,
}: {
  name: string
  label: string
  initial: string[]
  folder?: string
  hint?: string
}) {
  const [urls, setUrls] = useState<string[]>(initial)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isUploading, error, upload } = useUploader(folder)

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= urls.length) return

    setUrls((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>

      {/* URL ซ้ำกันได้ถ้าเผลอเลือกไฟล์เดิมสองรอบ — ใช้ลำดับเป็น key ไม่งั้น React จะทิ้งช่องที่ซ้ำ */}
      {urls.map((url, index) => (
        <input key={index} type="hidden" name={name} value={url} />
      ))}

      {urls.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {urls.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-subtle"
            >
              <Image src={url} alt="" fill sizes="200px" className="object-cover" unoptimized />

              <span className="tabular absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-xs text-white">
                {index + 1}
              </span>

              {/* ปุ่มจัดลำดับแบบกดทีละขั้น ใช้งานได้ทั้งเมาส์ นิ้ว และคีย์บอร์ด ต่างจากการลากวาง */}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`ย้ายรูปที่ ${index + 1} ไปก่อนหน้า`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded bg-white/90 text-black transition-opacity disabled:opacity-30"
                  >
                    <ArrowLeft size={13} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === urls.length - 1}
                    aria-label={`ย้ายรูปที่ ${index + 1} ไปถัดไป`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded bg-white/90 text-black transition-opacity disabled:opacity-30"
                  >
                    <ArrowRight size={13} strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setUrls((current) => current.filter((_, i) => i !== index))}
                  aria-label={`ลบรูปที่ ${index + 1}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded bg-white/90 text-destructive"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm transition-colors',
            'hover:border-foreground/25 hover:bg-muted disabled:opacity-60',
          )}
        >
          {isUploading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <Upload size={14} strokeWidth={1.75} aria-hidden />
          )}
          {isUploading ? 'กำลังอัปโหลด' : 'อัปโหลดรูป (เลือกหลายไฟล์ได้)'}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            upload(event.target.files, (uploaded) => setUrls((current) => [...current, ...uploaded]))
            event.target.value = ''
          }}
        />
      </div>

      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      )}
    </fieldset>
  )
}
