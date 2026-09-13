'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import type {
  ContentStatus,
  EquipmentCategory,
  EquipmentStatus,
  PriceUnit,
  ServiceCategory,
} from '@/generated/prisma/enums'
import { db } from '@/lib/db'
import type { AdminActionState } from './admin-state'
import type { CacheTag } from './cache'
import {
  boolean,
  integer,
  invalidUrlFields,
  isStaleWrite,
  list,
  listSignature,
  number,
  optionalText,
  pairs,
  requireAdmin,
  requireEditor,
  slugify,
  STALE_WRITE_MESSAGE,
  text,
  URL_FIELD_MESSAGE,
  versionOf,
} from './cms-helpers'

/**
 * Action ของ CMS ทั้งหมด
 *
 * รูปแบบเดียวกันทุกตัว: เช็คสิทธิ์ → อ่าน formData → เขียนฐานข้อมูล → ล้างแคช
 * สร้างใหม่จะ redirect กลับไปหน้ารายการ ส่วนการแก้จะคืน state ให้แสดงข้อความในหน้าเดิม
 *
 * การเขียนที่มีหลายขั้น (แก้ระเบียนแล้วแทนที่รายการลูกทั้งชุด) อยู่ในทรานแซกชันเดียวเสมอ
 * ถ้าล้มกลางทาง ของเดิมต้องอยู่ครบ ไม่ใช่เหลือระเบียนที่ลูกหายไปครึ่งหนึ่ง
 */

/**
 * ล้างข้อมูลที่หน้าเว็บสาธารณะแคชไว้ (ดู server/cache.ts)
 *
 * ใช้ updateTag ไม่ใช่ revalidateTag เพราะคนกดบันทึกมักเปิดหน้าเว็บดูผลต่อทันที
 * updateTag ทำให้คำขอถัดไปรอข้อมูลใหม่ ไม่เสิร์ฟของเก่าให้เห็นอีกหนึ่งรอบ
 */
function refreshPublicData(...tags: CacheTag[]) {
  for (const tag of tags) updateTag(tag)
}

/**
 * ล้างแคชหน้าสาธารณะ
 *
 * ต้องส่ง "รูปแบบเส้นทาง" ตามชื่อโฟลเดอร์จริง เช่น '/[locale]/work/[slug]'
 * ไม่ใช่เส้นทางที่แทน slug จริงลงไปแล้ว เพราะ Next จับคู่แท็กจากรูปแบบเส้นทาง
 * เส้นทางแบบ '/[locale]/work/ชื่อผลงาน' จะไม่ตรงกับอะไรเลย และไม่มีอะไรถูกล้าง
 */
function revalidateSite(...paths: string[]) {
  for (const path of paths) revalidatePath(path, 'page')
}

/**
 * ล้างแคชหน้าหลังบ้านที่แสดงข้อมูลชุดเดียวกัน
 *
 * สำคัญพอ ๆ กับหน้าสาธารณะ — ถ้าไม่ล้าง หน้ารายการกับหน้าแก้ไขจะยังถือภาพเก่าอยู่
 * แล้วการกดบันทึกจากหน้าที่เป็นภาพเก่าจะเขียนค่าเก่าทับของใหม่
 */
function revalidateAdmin(...paths: string[]) {
  for (const path of paths) revalidatePath(path)
}

function failure(error: unknown, label: string): AdminActionState {
  console.error(`[cms:${label}]`, error)
  const isDuplicate =
    (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') ||
    (error instanceof Error && error.message.includes('Unique constraint'))
  return {
    status: 'error',
    message: isDuplicate ? 'มีรายการที่ใช้ slug นี้อยู่แล้ว กรุณาเปลี่ยน slug' : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
  }
}

// ─────────────────────────── ผลงาน ───────────────────────────

/**
 * ผูกผลงานเข้ากับบริการที่ตรงหมวดกัน
 *
 * Service.category เป็น unique หนึ่งหมวดจึงมีบริการเดียวเสมอ
 * ก่อนหน้านี้ฟอร์มบันทึกแค่ category ทำให้ serviceId ว่างตลอด
 * และลิงก์ "บริการที่เกี่ยวข้อง" บนหน้ารายละเอียดผลงานไม่เคยขึ้นเลย
 */
async function serviceIdFor(category: ServiceCategory): Promise<string | null> {
  if (!category) return null
  const service = await db.service.findUnique({ where: { category }, select: { id: true } })
  return service?.id ?? null
}

export async function saveProject(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireEditor()

  const id = optionalText(formData, 'id')
  const titleTh = text(formData, 'titleTh')
  if (!titleTh) return { status: 'error', message: 'ต้องกรอกชื่อผลงานภาษาไทย' }

  /**
   * รูปปกเป็นคอลัมน์ที่ห้ามว่างในฐานข้อมูล และหน้าเว็บเอาไปใส่ next/image ตรง ๆ
   * ดาวจันทร์ในฟอร์มบอกว่าจำเป็น แต่ช่องจริงเป็น input hidden ซึ่งเบราว์เซอร์ไม่ตรวจ required ให้
   * ถ้าปล่อยผ่าน จะได้ผลงานที่ src เป็นข้อความว่าง แล้วหน้ารวมผลงานพังทั้งหน้า
   */
  const coverImage = text(formData, 'coverImage')
  if (!coverImage) return { status: 'error', message: 'ต้องใส่รูปปกก่อนบันทึก' }

  // สามช่องนี้ไปจบที่ href และ iframe บนหน้าผลงาน — กันค่าที่กดแล้วรันสคริปต์ตั้งแต่ตอนบันทึก
  const badUrls = invalidUrlFields(formData, {
    videoUrl: 'ลิงก์วิดีโอ',
    liveUrl: 'ลิงก์เว็บไซต์จริง',
    repoUrl: 'ลิงก์ซอร์สโค้ด',
  })
  if (badUrls.length) {
    return { status: 'error', message: `${badUrls.join(' และ ')} ${URL_FIELD_MESSAGE}` }
  }

  const slug = slugify(text(formData, 'slug') || text(formData, 'titleEn') || titleTh)
  const status = text(formData, 'status') as ContentStatus
  const mediaUrls = list(formData, 'mediaUrl')

  const data = {
    slug,
    category: text(formData, 'category') as ServiceCategory,
    titleTh,
    titleEn: text(formData, 'titleEn') || titleTh,
    summaryTh: text(formData, 'summaryTh'),
    summaryEn: text(formData, 'summaryEn') || text(formData, 'summaryTh'),
    bodyTh: optionalText(formData, 'bodyTh'),
    bodyEn: optionalText(formData, 'bodyEn'),
    clientName: optionalText(formData, 'clientName'),
    year: number(formData, 'year'),
    location: optionalText(formData, 'location'),
    coverImage,
    videoUrl: optionalText(formData, 'videoUrl'),
    liveUrl: optionalText(formData, 'liveUrl'),
    repoUrl: optionalText(formData, 'repoUrl'),
    techStack: list(formData, 'techStack'),
    creditsTh: pairs(formData, 'creditsTh', 'role', 'name'),
    creditsEn: pairs(formData, 'creditsEn', 'role', 'name'),
    isFeatured: boolean(formData, 'isFeatured'),
    status,
    order: integer(formData, 'order'),
    // ตั้งวันเผยแพร่ครั้งแรกที่กดเผยแพร่ ไม่ทับของเดิมเวลาแก้ซ้ำ
    publishedAt: status === 'PUBLISHED' ? new Date() : null,
  }

  try {
    const serviceId = await serviceIdFor(data.category)

    if (id) {
      const existing = await db.project.findUnique({
        where: { id },
        select: { publishedAt: true, updatedAt: true },
      })
      if (!existing) return { status: 'error', message: 'ไม่พบผลงานนี้ อาจถูกลบไปแล้ว' }
      if (isStaleWrite(text(formData, 'expectedVersion'), existing.updatedAt)) {
        return { status: 'error', message: STALE_WRITE_MESSAGE }
      }

      // แกลเลอรีแทนที่ทั้งชุด ในทรานแซกชันเดียวกับตัวผลงาน ภาพเดิมจึงไม่หายถ้าบันทึกล้มกลางทาง
      const updated = await db.$transaction(async (tx) => {
        const saved = await tx.project.update({
          where: { id },
          data: {
            ...data,
            serviceId,
            publishedAt: status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
          },
          select: { updatedAt: true },
        })

        await tx.projectMedia.deleteMany({ where: { projectId: id } })
        if (mediaUrls.length) {
          await tx.projectMedia.createMany({
            data: mediaUrls.map((url, index) => ({ projectId: id, url, order: index })),
          })
        }

        return saved
      })

      refreshPublicData('projects')
      revalidateSite('/[locale]/work', '/[locale]/work/[slug]', '/[locale]')
      revalidateAdmin('/admin/projects', `/admin/projects/${id}`, '/admin')
      return {
        status: 'success',
        message: 'บันทึกผลงานแล้ว',
        version: versionOf(updated.updatedAt),
      }
    }

    const created = await db.project.create({
      data: {
        ...data,
        serviceId,
        authorId: user.id,
        media: {
          create: mediaUrls.map((url, index) => ({ url, order: index })),
        },
      },
    })

    refreshPublicData('projects')
    revalidateSite('/[locale]/work', '/[locale]/work/[slug]', '/[locale]')
    revalidateAdmin('/admin/projects', '/admin')
    redirect(`/admin/projects/${created.id}`)
  } catch (error) {
    // redirect() ทำงานด้วยการโยน error — ต้องปล่อยผ่าน ไม่งั้นจะกลายเป็นข้อความ "บันทึกไม่สำเร็จ"
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    if (typeof error === 'object' && error !== null && 'digest' in error) throw error
    return failure(error, 'saveProject')
  }
}

export async function deleteProject(formData: FormData) {
  await requireEditor()
  const id = text(formData, 'id')

  try {
    await db.project.delete({ where: { id } })
  } catch (error) {
    console.error('[cms:deleteProject]', error)
  }

  refreshPublicData('projects')
  revalidateSite('/[locale]/work', '/[locale]/work/[slug]', '/[locale]')
  revalidateAdmin('/admin/projects', '/admin')
  redirect('/admin/projects')
}

// ─────────────────────── อุปกรณ์ให้เช่า ───────────────────────

export async function saveEquipment(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireEditor()

  const id = optionalText(formData, 'id')
  const brand = text(formData, 'brand')
  const model = text(formData, 'model')
  if (!brand || !model) return { status: 'error', message: 'ต้องกรอกยี่ห้อและรุ่น' }

  const dailyRate = number(formData, 'dailyRate')
  const weeklyRate = number(formData, 'weeklyRate')
  const depositAmount = number(formData, 'depositAmount')
  if ([dailyRate, weeklyRate, depositAmount].some((value) => value !== null && value < 0)) {
    return { status: 'error', message: 'ค่าเช่าและเงินมัดจำต้องไม่ติดลบ' }
  }

  const nameTh = text(formData, 'nameTh') || `${brand} ${model}`

  const data = {
    slug: slugify(text(formData, 'slug') || `${brand} ${model}`),
    category: text(formData, 'category') as EquipmentCategory,
    brand,
    model,
    nameTh,
    nameEn: text(formData, 'nameEn') || `${brand} ${model}`,
    descriptionTh: optionalText(formData, 'descriptionTh'),
    descriptionEn: optionalText(formData, 'descriptionEn'),
    specs: pairs(formData, 'specs', 'label', 'value'),
    dailyRate,
    weeklyRate,
    depositAmount,
    image: optionalText(formData, 'image'),
    gallery: list(formData, 'gallery'),
    quantity: Math.max(1, integer(formData, 'quantity', 1)),
    status: text(formData, 'status') as EquipmentStatus,
    isFeatured: boolean(formData, 'isFeatured'),
    isActive: boolean(formData, 'isActive'),
    order: integer(formData, 'order'),
  }

  try {
    if (id) {
      const existing = await db.equipment.findUnique({
        where: { id },
        select: { updatedAt: true },
      })
      if (!existing) return { status: 'error', message: 'ไม่พบอุปกรณ์นี้ อาจถูกลบไปแล้ว' }
      if (isStaleWrite(text(formData, 'expectedVersion'), existing.updatedAt)) {
        return { status: 'error', message: STALE_WRITE_MESSAGE }
      }

      const updated = await db.equipment.update({
        where: { id },
        data,
        select: { updatedAt: true },
      })

      refreshPublicData('equipment')
      revalidateSite('/[locale]/rental', '/[locale]/rental/[slug]', '/[locale]')
      revalidateAdmin('/admin/equipment', `/admin/equipment/${id}`)
      return {
        status: 'success',
        message: 'บันทึกอุปกรณ์แล้ว',
        version: versionOf(updated.updatedAt),
      }
    }

    await db.equipment.create({ data })
    refreshPublicData('equipment')
    revalidateSite('/[locale]/rental', '/[locale]/rental/[slug]', '/[locale]')
    revalidateAdmin('/admin/equipment')
    redirect('/admin/equipment')
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'digest' in error) throw error
    return failure(error, 'saveEquipment')
  }
}

export async function deleteEquipment(formData: FormData) {
  await requireEditor()

  try {
    await db.equipment.delete({ where: { id: text(formData, 'id') } })
  } catch (error) {
    console.error('[cms:deleteEquipment]', error)
  }

  refreshPublicData('equipment')
  revalidateSite('/[locale]/rental', '/[locale]/rental/[slug]', '/[locale]')
  revalidateAdmin('/admin/equipment')
  redirect('/admin/equipment')
}

// ─────────────────────────── บริการ ───────────────────────────

export async function saveService(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireEditor()

  const id = text(formData, 'id')

  const existing = await db.service.findUnique({ where: { id }, select: { updatedAt: true } })
  if (!existing) return { status: 'error', message: 'ไม่พบบริการนี้' }
  if (isStaleWrite(text(formData, 'expectedVersion'), existing.updatedAt)) {
    return { status: 'error', message: STALE_WRITE_MESSAGE }
  }

  let updatedAt: Date
  try {
    ;({ updatedAt } = await db.service.update({
      where: { id },
      select: { updatedAt: true },
      data: {
        titleTh: text(formData, 'titleTh'),
        titleEn: text(formData, 'titleEn'),
        taglineTh: text(formData, 'taglineTh'),
        taglineEn: text(formData, 'taglineEn'),
        descriptionTh: text(formData, 'descriptionTh'),
        descriptionEn: text(formData, 'descriptionEn'),
        icon: text(formData, 'icon') || 'Aperture',
        coverImage: optionalText(formData, 'coverImage'),
        highlightsTh: list(formData, 'highlightsTh'),
        highlightsEn: list(formData, 'highlightsEn'),
        processTh: pairs(formData, 'processTh', 'title', 'detail'),
        processEn: pairs(formData, 'processEn', 'title', 'detail'),
        faqTh: pairs(formData, 'faqTh', 'question', 'answer'),
        faqEn: pairs(formData, 'faqEn', 'question', 'answer'),
        isActive: boolean(formData, 'isActive'),
        order: integer(formData, 'order'),
      },
    }))
  } catch (error) {
    return failure(error, 'saveService')
  }

  // ชื่อบริการขึ้นในหน้าผลงานด้วย (ลิงก์บริการที่เกี่ยวข้อง)
  refreshPublicData('services', 'projects')
  revalidateSite('/[locale]/services', '/[locale]/services/[slug]', '/[locale]')
  revalidateAdmin('/admin/services', `/admin/services/${id}`)
  return { status: 'success', message: 'บันทึกบริการแล้ว', version: versionOf(updatedAt) }
}

/**
 * ลายเซ็นของชุดแพ็กเกจ ณ ตอนนี้
 *
 * ถ้าลายเซ็นที่ฟอร์มส่งกลับมาไม่ตรงกับของจริง แปลว่าหน้านั้นเป็นภาพก่อนที่จะมีใครบันทึกไป
 */
async function packageSignature(serviceId: string): Promise<string> {
  const rows = await db.servicePackage.findMany({
    where: { serviceId },
    orderBy: { order: 'asc' },
    select: { id: true },
  })
  return listSignature(rows.map((row) => row.id))
}

export async function saveServicePackages(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireEditor()

  const serviceId = text(formData, 'serviceId')

  const nameTh = formData.getAll('pkgNameTh').map((v) => String(v).trim())
  const nameEn = formData.getAll('pkgNameEn').map((v) => String(v).trim())
  const priceFrom = formData.getAll('pkgPrice').map((v) => String(v).trim())
  const priceUnit = formData.getAll('pkgUnit').map((v) => String(v) as PriceUnit)
  const includesTh = formData.getAll('pkgIncludesTh').map((v) => String(v))
  const includesEn = formData.getAll('pkgIncludesEn').map((v) => String(v))
  const popularIndex = text(formData, 'pkgPopular')

  const rows = nameTh
    .map((name, index) => ({
      nameTh: name,
      nameEn: nameEn[index] || name,
      priceFrom: priceFrom[index] ? Number(priceFrom[index].replace(/,/g, '')) : null,
      priceUnit: priceUnit[index] ?? ('PROJECT' as PriceUnit),
      // แต่ละบรรทัดในกล่องข้อความ = หนึ่งรายการที่ลูกค้าจะได้รับ
      includesTh: (includesTh[index] ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
      includesEn: (includesEn[index] ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
      isPopular: String(index) === popularIndex,
      order: index + 1,
      serviceId,
    }))
    .filter((row) => row.nameTh)

  const badPrice = rows.find(
    (row) => row.priceFrom !== null && (!Number.isFinite(row.priceFrom) || row.priceFrom < 0),
  )
  if (badPrice) {
    return { status: 'error', message: `ราคาของแพ็กเกจ "${badPrice.nameTh}" ต้องเป็นตัวเลขที่ไม่ติดลบ` }
  }

  /**
   * การบันทึกนี้ลบแพ็กเกจเดิมทิ้งทั้งชุดแล้วสร้างใหม่ — เป็น action ที่ทำลายข้อมูลมากที่สุดใน CMS
   * ถ้าหน้าที่กดบันทึกเป็นภาพเก่า แพ็กเกจที่คนอื่นเพิ่งเพิ่มจะหายไปโดยไม่มีใครรู้
   * จึงเทียบ "ลายเซ็น" ของชุดแพ็กเกจปัจจุบันก่อนเสมอ (id เปลี่ยนทุกครั้งที่บันทึก จึงใช้เป็นเวอร์ชันได้)
   */
  const current = await packageSignature(serviceId)
  if (isStaleWrite(text(formData, 'expectedVersion'), current)) {
    return { status: 'error', message: STALE_WRITE_MESSAGE }
  }

  try {
    // แทนที่ทั้งชุดในทรานแซกชันเดียว ถ้าสร้างใหม่ล้มกลางทางของเดิมต้องไม่หายไปเฉย ๆ
    await db.$transaction([
      db.servicePackage.deleteMany({ where: { serviceId } }),
      ...(rows.length ? [db.servicePackage.createMany({ data: rows })] : []),
    ])
  } catch (error) {
    return failure(error, 'saveServicePackages')
  }

  refreshPublicData('services')
  revalidateSite('/[locale]/services', '/[locale]/services/[slug]', '/[locale]')
  revalidateAdmin('/admin/services', `/admin/services/${serviceId}`)
  return {
    status: 'success',
    message: `บันทึก ${rows.length} แพ็กเกจแล้ว`,
    version: await packageSignature(serviceId),
  }
}

// ─────────────────────────── บทความ ───────────────────────────

export async function savePost(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireEditor()

  const id = optionalText(formData, 'id')
  const titleTh = text(formData, 'titleTh')
  if (!titleTh) return { status: 'error', message: 'ต้องกรอกชื่อบทความภาษาไทย' }

  const slug = slugify(text(formData, 'slug') || text(formData, 'titleEn') || titleTh)
  const status = text(formData, 'status') as ContentStatus
  const bodyTh = text(formData, 'bodyTh')

  const data = {
    slug,
    titleTh,
    titleEn: text(formData, 'titleEn') || titleTh,
    excerptTh: text(formData, 'excerptTh'),
    excerptEn: text(formData, 'excerptEn') || text(formData, 'excerptTh'),
    bodyTh,
    bodyEn: text(formData, 'bodyEn') || bodyTh,
    coverImage: optionalText(formData, 'coverImage'),
    tags: list(formData, 'tags'),
    // ประมาณจากภาษาไทยราว 3 ตัวอักษรต่อคำ อ่านได้ราว 200 คำต่อนาที
    readingMinutes: Math.max(1, Math.round(bodyTh.length / 3 / 200)),
    isFeatured: boolean(formData, 'isFeatured'),
    status,
  }

  try {
    if (id) {
      const existing = await db.post.findUnique({
        where: { id },
        select: { publishedAt: true, updatedAt: true },
      })
      if (!existing) return { status: 'error', message: 'ไม่พบบทความนี้ อาจถูกลบไปแล้ว' }
      if (isStaleWrite(text(formData, 'expectedVersion'), existing.updatedAt)) {
        return { status: 'error', message: STALE_WRITE_MESSAGE }
      }

      const updated = await db.post.update({
        where: { id },
        select: { updatedAt: true },
        data: {
          ...data,
          publishedAt: status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
        },
      })

      refreshPublicData('posts')
      revalidateSite('/[locale]/blog', '/[locale]/blog/[slug]', '/[locale]')
      revalidateAdmin('/admin/posts', `/admin/posts/${id}`)
      return {
        status: 'success',
        message: 'บันทึกบทความแล้ว',
        version: versionOf(updated.updatedAt),
      }
    }

    const created = await db.post.create({
      data: {
        ...data,
        authorId: user.id,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    })

    refreshPublicData('posts')
    revalidateSite('/[locale]/blog', '/[locale]/blog/[slug]', '/[locale]')
    revalidateAdmin('/admin/posts')
    redirect(`/admin/posts/${created.id}`)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'digest' in error) throw error
    return failure(error, 'savePost')
  }
}

export async function deletePost(formData: FormData) {
  await requireEditor()

  try {
    await db.post.delete({ where: { id: text(formData, 'id') } })
  } catch (error) {
    console.error('[cms:deletePost]', error)
  }

  refreshPublicData('posts')
  revalidateSite('/[locale]/blog', '/[locale]/blog/[slug]', '/[locale]')
  revalidateAdmin('/admin/posts')
  redirect('/admin/posts')
}

// ─────────────────────────── ทีมงาน ───────────────────────────

export async function saveTeamMember(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireEditor()

  const id = optionalText(formData, 'id')
  const name = text(formData, 'name')
  if (!name) return { status: 'error', message: 'ต้องกรอกชื่อ' }

  const data = {
    name,
    roleTh: text(formData, 'roleTh'),
    roleEn: text(formData, 'roleEn') || text(formData, 'roleTh'),
    bioTh: optionalText(formData, 'bioTh'),
    bioEn: optionalText(formData, 'bioEn'),
    photo: optionalText(formData, 'photo'),
    email: optionalText(formData, 'email'),
    socials: Object.fromEntries(
      ['instagram', 'facebook', 'linkedin', 'github', 'website']
        .map((key) => [key, optionalText(formData, `social_${key}`)])
        .filter(([, value]) => value),
    ),
    isActive: boolean(formData, 'isActive'),
    order: integer(formData, 'order'),
  }

  let version: string | undefined

  try {
    if (id) {
      const existing = await db.teamMember.findUnique({
        where: { id },
        select: { updatedAt: true },
      })
      if (!existing) return { status: 'error', message: 'ไม่พบสมาชิกคนนี้ อาจถูกลบไปแล้ว' }
      if (isStaleWrite(text(formData, 'expectedVersion'), existing.updatedAt)) {
        return { status: 'error', message: STALE_WRITE_MESSAGE }
      }

      const updated = await db.teamMember.update({
        where: { id },
        data,
        select: { updatedAt: true },
      })
      version = versionOf(updated.updatedAt)
    } else {
      await db.teamMember.create({ data })
    }
  } catch (error) {
    return failure(error, 'saveTeamMember')
  }

  refreshPublicData('team')
  revalidateSite('/[locale]/about')
  revalidateAdmin('/admin/team')
  return { status: 'success', message: 'บันทึกข้อมูลทีมงานแล้ว', version }
}

export async function deleteTeamMember(formData: FormData) {
  await requireEditor()

  try {
    await db.teamMember.delete({ where: { id: text(formData, 'id') } })
  } catch (error) {
    console.error('[cms:deleteTeamMember]', error)
  }

  refreshPublicData('team')
  revalidateSite('/[locale]/about')
  revalidateAdmin('/admin/team')
}

// ─────────────────── ข้อมูลบริษัทและค่าตั้งค่า ───────────────────

export async function saveSettings(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin()

  /**
   * ลิงก์โซเชียลขึ้นทุกหน้าผ่านฟุตเตอร์ และลิงก์แผนที่เอาไปใส่ href เช่นกัน
   * ค่าที่หลุดเข้ามาเป็น `javascript:` จึงกลายเป็น stored XSS ที่กระทบทั้งเว็บ ไม่ใช่หน้าเดียว
   */
  const badUrls = invalidUrlFields(formData, {
    social_facebook: 'Facebook',
    social_instagram: 'Instagram',
    social_youtube: 'YouTube',
    social_tiktok: 'TikTok',
    social_line: 'LINE',
    company_mapUrl: 'ลิงก์แผนที่',
  })
  if (badUrls.length) {
    return { status: 'error', message: `${badUrls.join(', ')} ${URL_FIELD_MESSAGE}` }
  }

  const defaultVatRate = number(formData, 'quote_defaultVatRate') ?? 7
  const defaultWithholdingRate = number(formData, 'quote_defaultWithholdingRate') ?? 3
  if ([defaultVatRate, defaultWithholdingRate].some((rate) => rate < 0 || rate > 100)) {
    return { status: 'error', message: 'อัตรา VAT และภาษีหัก ณ ที่จ่าย ต้องอยู่ระหว่าง 0 ถึง 100%' }
  }

  const company = {
    nameTh: text(formData, 'company_nameTh'),
    nameEn: text(formData, 'company_nameEn'),
    legalNameTh: text(formData, 'company_legalNameTh'),
    taxId: text(formData, 'company_taxId'),
    addressTh: text(formData, 'company_addressTh'),
    addressEn: text(formData, 'company_addressEn'),
    email: text(formData, 'company_email'),
    phone: text(formData, 'company_phone'),
    lineId: text(formData, 'company_lineId'),
    openingHoursTh: text(formData, 'company_openingHoursTh'),
    openingHoursEn: text(formData, 'company_openingHoursEn'),
    mapUrl: text(formData, 'company_mapUrl'),
    latitude: number(formData, 'company_latitude') ?? 13.7563,
    longitude: number(formData, 'company_longitude') ?? 100.5018,
  }

  const social = {
    facebook: text(formData, 'social_facebook'),
    instagram: text(formData, 'social_instagram'),
    youtube: text(formData, 'social_youtube'),
    tiktok: text(formData, 'social_tiktok'),
    line: text(formData, 'social_line'),
  }

  const hero = {
    eyebrowTh: text(formData, 'hero_eyebrowTh'),
    eyebrowEn: text(formData, 'hero_eyebrowEn'),
    headlineTh: text(formData, 'hero_headlineTh'),
    headlineEn: text(formData, 'hero_headlineEn'),
    subheadlineTh: text(formData, 'hero_subheadlineTh'),
    subheadlineEn: text(formData, 'hero_subheadlineEn'),
  }

  const quote = {
    defaultValidDays: Math.max(1, integer(formData, 'quote_defaultValidDays', 30)),
    defaultVatRate,
    defaultWithholdingRate,
    termsTh: text(formData, 'quote_termsTh'),
    termsEn: text(formData, 'quote_termsEn'),
    bankName: text(formData, 'quote_bankName'),
    bankAccountName: text(formData, 'quote_bankAccountName'),
    bankAccountNumber: text(formData, 'quote_bankAccountNumber'),
  }

  try {
    // สี่กลุ่มบันทึกพร้อมกันหรือไม่บันทึกเลย ไม่ให้เหลือข้อมูลบริษัทใหม่คู่กับค่าตั้งค่าชุดเก่า
    await db.$transaction(
      Object.entries({ company, social, hero, quote }).map(([key, value]) =>
        db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    )
  } catch (error) {
    return failure(error, 'saveSettings')
  }

  // ข้อมูลบริษัทอยู่ใน footer ของทุกหน้า จึงต้องล้างแคชทั้งเว็บ
  refreshPublicData('settings')
  revalidatePath('/', 'layout')
  revalidateAdmin('/admin/settings')
  return { status: 'success', message: 'บันทึกข้อมูลบริษัทแล้ว' }
}
