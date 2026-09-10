import type { Metadata } from 'next'
import Image from 'next/image'
import { AdminPageHeader, EmptyState } from '@/components/admin/AdminPage'
import { ConfirmIconSubmit } from '@/components/admin/AdminUI'
import { CopyUrlButton } from '@/components/admin/CopyUrlButton'
import { MediaUploader } from '@/components/admin/MediaUploader'
import { db } from '@/lib/db'
import { isR2Configured } from '@/lib/env'
import { formatDate } from '@/lib/format'
import { deleteMediaAsset } from '@/server/media-actions'

export const metadata: Metadata = { title: 'คลังไฟล์' }

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

export default async function AdminMediaPage() {
  const assets = await db.mediaAsset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { uploadedBy: { select: { name: true } } },
  })

  const totalBytes = assets.reduce((sum, asset) => sum + asset.size, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="คลังไฟล์"
        description={
          assets.length > 0
            ? `${assets.length} ไฟล์ · รวม ${formatSize(totalBytes)} เก็บบน Cloudflare R2`
            : 'ไฟล์ทั้งหมดเก็บบน Cloudflare R2 และเสิร์ฟผ่าน CDN'
        }
      />

      {!isR2Configured && (
        <p className="mb-6 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          ยังไม่ได้ตั้งค่า R2 ในไฟล์ .env — อัปโหลดไม่ได้จนกว่าจะตั้งครบทั้ง 5 ค่า
        </p>
      )}

      <div className="mb-8">
        <MediaUploader />
      </div>

      {assets.length === 0 ? (
        <EmptyState>ยังไม่มีไฟล์ในคลัง</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="group overflow-hidden rounded-lg border border-border bg-surface"
            >
              <div className="relative aspect-[4/3] bg-subtle">
                <Image
                  src={asset.url}
                  alt={asset.altTh ?? ''}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                  unoptimized
                />

                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <CopyUrlButton url={asset.url} />
                  <form action={deleteMediaAsset}>
                    <input type="hidden" name="id" value={asset.id} />
                    <ConfirmIconSubmit
                      label={`ลบไฟล์ ${asset.fileName}`}
                      confirmLabel={`ยืนยันลบไฟล์ ${asset.fileName}`}
                    />
                  </form>
                </div>
              </div>

              <div className="p-3">
                <p className="truncate text-xs font-medium" title={asset.fileName}>
                  {asset.fileName}
                </p>
                <p className="tabular mt-0.5 text-[0.7rem] text-muted-foreground">
                  {asset.width && asset.height && `${asset.width}×${asset.height} · `}
                  {formatSize(asset.size)}
                </p>
                <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                  {formatDate(asset.createdAt, 'th')}
                  {asset.uploadedBy && ` · ${asset.uploadedBy.name}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
