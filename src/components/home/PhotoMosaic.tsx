import { Link } from '@/i18n/navigation'
import { ContentImage } from '@/components/ui/ContentImage'

export type MosaicPhoto = { key: string; url: string; href: string; title: string }

/**
 * ภาพจากงานถ่ายจริง วางเป็นโมเสกขนาดไม่เท่ากัน สลับงานละภาพ
 *
 * ภาพเป็นลิงก์สำหรับเมาส์และนิ้วเท่านั้น ไม่รับโฟกัสคีย์บอร์ด
 * ภาพเจ็ดใบพาไปแค่สองสามงาน ถ้าให้คีย์บอร์ดหยุดทุกใบ ต้องกด Tab ไปที่เดิมซ้ำหลายรอบ
 * ลิงก์ชื่องานใต้โมเสกคือทางเข้าของคีย์บอร์ดและ screen reader
 */
export function PhotoMosaic({ photos, unavailableLabel }: { photos: MosaicPhoto[]; unavailableLabel: string }) {
  return (
    <div className="photo-mosaic" data-enter>
      {photos.map((photo, index) => (
        <Link key={photo.key} href={photo.href} tabIndex={-1} aria-hidden className="photo-tile">
          <ContentImage
            src={photo.url}
            alt=""
            unavailableLabel={unavailableLabel}
            fill
            sizes={index === 0 || index === 5 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
            className="object-cover"
          />
          <span className="photo-tile-caption">{photo.title}</span>
        </Link>
      ))}
    </div>
  )
}
