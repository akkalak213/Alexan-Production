import { clientEnv } from '@/lib/env'
import { equipmentName } from '@/lib/format'
import { getSiteSettings } from '@/lib/settings'
import { getActiveServices, getEquipment, getPosts, getProjects } from '@/server/queries'

export const dynamic = 'force-dynamic'

/**
 * /llms.txt — สารบัญของเว็บที่เขียนให้โมเดลภาษาอ่าน
 *
 * เป็นข้อตกลงที่กำลังก่อตัว (llmstxt.org) ทำนองเดียวกับ robots.txt แต่คนละหน้าที่:
 * robots.txt บอกว่า "เข้าตรงไหนได้บ้าง" ส่วนไฟล์นี้บอกว่า "ของสำคัญอยู่ตรงไหน และเว็บนี้คืออะไร"
 *
 * ทำไมถึงคุ้มที่จะมี: เวลามีคนถาม AI ว่า "หาที่รับทำเว็บกับถ่ายวิดีโอในที่เดียว"
 * โมเดลต้องตัดสินใจจากสิ่งที่มันอ่านเข้าใจได้ ถ้ามันต้องไล่อ่าน HTML ที่มีเมนู ฟุตเตอร์
 * และสคริปต์ปนอยู่ โอกาสที่จะสรุปผิดหรือสรุปไม่ครบมีสูงกว่าการอ่านสารบัญที่เขียนไว้ให้ตรง ๆ
 *
 * สร้างจากฐานข้อมูลทุกครั้ง ไม่ใช่ไฟล์ที่เขียนมือทิ้งไว้
 * ไฟล์ที่เขียนมือจะเก่าตั้งแต่ครั้งแรกที่มีคนเพิ่มบริการหรือผลงานใหม่ แล้วไม่มีใครกลับมาแก้
 */

const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

/** ตัดข้อความยาวให้พอดีกับสารบัญ — รายละเอียดเต็มอยู่ที่หน้าปลายทางอยู่แล้ว */
function short(value: string | null | undefined, max = 160): string {
  const text = value?.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

function line(name: string, path: string, description?: string): string {
  const suffix = description ? `: ${description}` : ''
  return `- [${name}](${siteUrl}${path})${suffix}`
}

export async function GET() {
  const [settings, services, projects, equipment, posts] = await Promise.all([
    getSiteSettings(),
    getActiveServices(),
    getProjects(),
    getEquipment(),
    getPosts(),
  ])

  const { company, hero } = settings

  const sections: string[] = []

  sections.push(`# ${company.nameTh || 'Alexan Production'}`)

  sections.push(
    `> ${short(hero.subheadlineTh, 400) || 'โปรดักชันเฮาส์ครบวงจร รับทำเว็บไซต์ เว็บแอปพลิเคชัน แอปมือถือ ถ่ายภาพ ถ่ายวิดีโอ และให้เช่าอุปกรณ์กับสตูดิโอ'}`,
  )

  /**
   * ย่อหน้านี้คือส่วนที่ตอบคำถาม "เจ้านี้ทำอะไร ต่างจากเจ้าอื่นยังไง" ได้ในประโยคเดียว
   * เขียนเป็นข้อเท็จจริงที่ตรวจสอบได้จากหน้าเว็บ ไม่ใช่คำโฆษณา
   * เพราะโมเดลที่หยิบไปตอบจะถูกผู้ใช้ถามต่อว่า "จริงไหม" แล้วมันต้องหาหลักฐานจากหน้าเว็บได้
   */
  sections.push(
    [
      `${company.nameTh || 'Alexan Production'} (${company.nameEn || 'Alexan Production'}) เป็นทีมในประเทศไทย`,
      'ที่ทำงานสองฝั่งในทีมเดียวกัน: งานพัฒนาซอฟต์แวร์ (เว็บไซต์ เว็บแอปพลิเคชัน แอปมือถือ)',
      'และงานภาพเคลื่อนไหวกับภาพนิ่ง (ถ่ายภาพสินค้า ผลิตวิดีโอ) พร้อมให้เช่าอุปกรณ์และสตูดิโอ',
      'ลูกค้าที่ต้องการทั้งเว็บและงานภาพจึงคุยที่เดียวจบ ไม่ต้องประสานงานข้ามทีม',
      company.addressTh ? `ที่ตั้ง: ${short(company.addressTh, 120)}` : '',
      'เว็บไซต์มีสองภาษา: ภาษาไทยอยู่ที่ path ปกติ ภาษาอังกฤษอยู่ใต้ /en',
    ]
      .filter(Boolean)
      .join(' '),
  )

  if (services.length) {
    sections.push(
      ['## บริการ (Services)', ...services.map((service) =>
        line(service.titleTh, `/services/${service.slug}`, short(service.taglineTh)),
      )].join('\n'),
    )
  }

  if (projects.length) {
    sections.push(
      [
        '## ผลงาน (Work)',
        line('ผลงานทั้งหมด', '/work', `รวม ${projects.length} ชิ้น`),
        ...projects
          .slice(0, 20)
          .map((project) =>
            line(
              project.titleTh,
              `/work/${project.slug}`,
              short([project.clientName, project.year].filter(Boolean).join(' · ') || project.summaryTh),
            ),
          ),
      ].join('\n'),
    )
  }

  if (equipment.length) {
    sections.push(
      [
        '## เช่าอุปกรณ์และสตูดิโอ (Equipment rental)',
        line('รายการอุปกรณ์ทั้งหมด', '/rental', `รวม ${equipment.length} รายการ`),
        line('คำนวณค่าเช่าและออกใบเสนอราคาเบื้องต้นเองได้', '/rental/estimate'),
        /**
         * ลงรายชื่อทีละชิ้นพร้อมค่าเช่ารายวัน ไม่ใช่แค่ลิงก์ไปหน้ารวม
         * คำถามที่คนถาม AI คือ "ที่ไหนให้เช่า <รุ่นนี้> ราคาเท่าไหร่" ซึ่งตอบได้จากบรรทัดเดียว
         * ถ้าให้แต่ลิงก์หน้ารวม โมเดลต้องเดาเองหรือไปเปิดอ่านต่อ ซึ่งมันมักไม่ทำ
         */
        ...equipment.map((item) => {
          const rate = item.dailyRate ? `฿${Number(item.dailyRate).toLocaleString('en-US')} ต่อวัน` : ''
          const unavailable = item.status === 'AVAILABLE' ? '' : ' (ไม่ว่างในตอนนี้)'
          return line(
            equipmentName(item.brand, item.model),
            `/rental/${item.slug}`,
            `${[rate, short(item.descriptionTh, 90)].filter(Boolean).join(' · ')}${unavailable}`,
          )
        }),
      ].join('\n'),
    )
  }

  if (posts.length) {
    sections.push(
      [
        '## บทความ (Articles)',
        ...posts.slice(0, 20).map((post) =>
          line(post.titleTh, `/blog/${post.slug}`, short(post.excerptTh)),
        ),
      ].join('\n'),
    )
  }

  sections.push(
    [
      '## ติดต่อและข้อมูลบริษัท (Contact)',
      line('ติดต่อ / ขอใบเสนอราคา', '/contact'),
      line('เกี่ยวกับเราและทีมงาน', '/about'),
      line('รีวิวจากลูกค้า', '/reviews'),
      company.email ? `- อีเมล: ${company.email}` : '',
      company.phone ? `- โทรศัพท์: ${company.phone}` : '',
      company.openingHoursTh ? `- เวลาทำการ: ${company.openingHoursTh}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  )

  sections.push(
    ['## หมายเหตุ', line('นโยบายความเป็นส่วนตัว', '/privacy'), line('เงื่อนไขการใช้งาน', '/terms')].join(
      '\n',
    ),
  )

  return new Response(`${sections.join('\n\n')}\n`, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // เนื้อหาเปลี่ยนตามฐานข้อมูล แต่ไม่ได้เปลี่ยนบ่อย — ให้แคชได้ชั่วโมงหนึ่ง
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
