'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type GalleryItem = {
  id: string
  url: string
  width: number | null
  height: number | null
  blurData: string | null
  caption: string | null
  alt: string | null
}

type Props = {
  items: GalleryItem[]
  /** masonry สำหรับงานภาพที่มีทั้งแนวตั้งแนวนอน, grid สำหรับงานที่สัดส่วนใกล้เคียงกัน */
  layout?: 'masonry' | 'grid'
}

export function MediaGallery({ items, layout = 'masonry' }: Props) {
  const t = useTranslations('work')
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const isOpen = openIndex !== null

  const close = useCallback(() => setOpenIndex(null), [])

  const step = useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((current) => {
        if (current === null) return current
        return (current + direction + items.length) % items.length
      })
    },
    [items.length],
  )

  /**
   * กล่องภาพเป็น <dialog> ที่เปิดด้วย showModal() ไม่ใช่ div ที่วางทับหน้า
   *
   * div ธรรมดาปล่อยให้ Tab เดินออกไปโดนลิงก์ของหน้าด้านหลังได้ทั้งที่กล่องภาพยังบังอยู่
   * showModal() ทำให้ทุกอย่างนอกกล่องเป็น inert ให้เอง โฟกัสจึงวนอยู่ในกล่อง
   * และ screen reader อ่านเฉพาะกล่อง ส่วน Escape เบราว์เซอร์ปิดให้ แล้วแจ้งกลับทาง onClose
   */
  useEffect(() => {
    const dialog = dialogRef.current
    if (!isOpen || !dialog) return

    // ภาพที่ผู้ใช้กดเข้ามา เก็บไว้คืนโฟกัสตอนปิด ไม่ให้โฟกัสเด้งไปต้นหน้า
    const trigger = triggerRef.current

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }

    if (!dialog.open) dialog.showModal()
    closeButtonRef.current?.focus()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
      if (dialog.open) dialog.close()
      trigger?.focus()
    }
  }, [isOpen, step])

  if (items.length === 0) return null

  const active = openIndex !== null ? items[openIndex] : null
  // คำนวณตำแหน่งไว้ล่วงหน้า เพื่อไม่ต้องพึ่ง TypeScript narrow openIndex ซ้ำในหลายจุดของ JSX
  const position = openIndex !== null ? { current: openIndex + 1, total: items.length } : null

  return (
    <>
      <ul
        className={cn(
          layout === 'masonry'
            ? 'columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4'
            : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {items.map((item, index) => (
          <li key={item.id} className={layout === 'masonry' ? 'break-inside-avoid' : undefined}>
            <button
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget
                setOpenIndex(index)
              }}
              aria-label={t('openImage')}
              className="group relative block w-full overflow-hidden rounded-md border border-border bg-subtle"
            >
              <Image
                src={item.url}
                alt={item.alt ?? ''}
                width={item.width ?? 1400}
                height={item.height ?? 950}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                placeholder={item.blurData ? 'blur' : 'empty'}
                blurDataURL={item.blurData ?? undefined}
                className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
              {item.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {item.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/*
        อยู่ในหน้าตลอดแต่เบราว์เซอร์ซ่อนไว้จนกว่าจะ showModal()
        ห้ามใส่ display (flex) ตรง ๆ — จะทับกฎที่ซ่อน dialog ตอนปิด ต้องใช้ open:flex
      */}
      <dialog
        ref={dialogRef}
        aria-label={position ? t('imagePosition', position) : undefined}
        onClose={close}
        onClick={close}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-black/95 p-0 backdrop-blur-sm open:flex open:flex-col backdrop:bg-transparent"
      >
        {active && position && (
          <>
            <div className="flex items-center justify-between p-4">
              <p className="tabular text-sm text-white/60">{t('imagePosition', position)}</p>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label={t('closeImage')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={22} strokeWidth={1.75} />
              </button>
            </div>

            <div
              className="relative flex flex-1 items-center justify-center px-4 pb-4"
              // คลิกที่ตัวภาพไม่ควรปิด — ปิดเฉพาะเมื่อคลิกพื้นหลัง
              onClick={(event) => event.stopPropagation()}
            >
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t('previousImage')}
                  className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white/80 transition-colors hover:bg-black/70 hover:text-white sm:left-6"
                >
                  <ChevronLeft size={24} strokeWidth={1.75} />
                </button>
              )}

              <Image
                key={active.id}
                src={active.url}
                alt={active.alt ?? ''}
                width={active.width ?? 1600}
                height={active.height ?? 1100}
                sizes="100vw"
                className="max-h-[80dvh] w-auto max-w-full object-contain"
              />

              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t('nextImage')}
                  className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white/80 transition-colors hover:bg-black/70 hover:text-white sm:right-6"
                >
                  <ChevronRight size={24} strokeWidth={1.75} />
                </button>
              )}
            </div>

            {active.caption && (
              <p className="px-6 pb-6 text-center text-sm text-white/70">{active.caption}</p>
            )}
          </>
        )}
      </dialog>
    </>
  )
}
