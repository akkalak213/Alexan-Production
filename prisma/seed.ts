/**
 * ข้อมูลตัวอย่างสำหรับ Alexan Production
 *
 *   npm run db:seed
 *
 * รันซ้ำได้ — ทุกอย่างใช้ upsert โดยอ้าง slug/key เป็นตัวระบุ
 * รูปทั้งหมดเป็น placeholder จาก picsum.photos รอเปลี่ยนเป็นงานจริงผ่านหน้า /admin
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import {
  ContentStatus,
  EquipmentCategory,
  PriceUnit,
  ReviewStatus,
  ServiceCategory,
  UserRole,
} from '../src/generated/prisma/enums'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('ไม่พบ DATABASE_URL — ตั้งค่าใน .env ก่อนรัน seed')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const img = (seed: string, w = 1600, h = 1000) => `https://picsum.photos/seed/${seed}/${w}/${h}`

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@alexan.studio'
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!password) {
    console.warn('⚠  ข้าม admin — ตั้ง SEED_ADMIN_PASSWORD ใน .env ก่อน แล้วรัน seed ใหม่')
    return null
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: UserRole.ADMIN, isActive: true },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? 'Alexan Admin',
      passwordHash: await bcrypt.hash(password, 12),
      role: UserRole.ADMIN,
    },
  })
  console.log(`✓ admin: ${user.email}`)
  return user
}

const services = [
  {
    slug: 'web',
    category: ServiceCategory.WEB,
    icon: 'Globe',
    titleTh: 'เว็บไซต์องค์กร',
    titleEn: 'Corporate Websites',
    taglineTh: 'เว็บที่โหลดไว ค้นเจอใน Google และคุณแก้เนื้อหาเองได้',
    taglineEn: 'Fast, findable sites your team can update without a developer',
    descriptionTh:
      'เราออกแบบและพัฒนาเว็บไซต์ให้ธุรกิจที่ต้องการมากกว่าหน้าเว็บสวย ๆ ทุกโปรเจกต์มาพร้อมระบบจัดการเนื้อหา โครงสร้าง SEO ที่วางมาตั้งแต่แรก และคะแนน PageSpeed ที่วัดผลได้จริง ไม่ใช่เทมเพลตสำเร็จรูปที่ปรับอะไรไม่ได้',
    descriptionEn:
      'We design and build websites for businesses that need more than a pretty page. Every project ships with a content management system, SEO structure planned from day one, and PageSpeed scores we can actually show you — not a locked-down template.',
    highlightsTh: [
      'ระบบจัดการเนื้อหาสองภาษาไทย/อังกฤษ',
      'โครงสร้าง SEO และ schema markup ครบ',
      'คะแนน Core Web Vitals ผ่านเกณฑ์ทุกหน้า',
      'ดูแลหลังส่งมอบ 3 เดือน',
    ],
    highlightsEn: [
      'Bilingual Thai/English content management',
      'Complete SEO structure and schema markup',
      'Passing Core Web Vitals on every page',
      'Three months of post-launch support',
    ],
    processTh: [
      { title: 'ทำความเข้าใจธุรกิจ', detail: 'คุยกับทีมคุณเพื่อเข้าใจลูกค้า คู่แข่ง และเป้าหมายที่วัดผลได้' },
      { title: 'วางโครงและออกแบบ', detail: 'ร่างผังเว็บและออกแบบหน้าจอจริงให้ดูก่อนเขียนโค้ดบรรทัดแรก' },
      { title: 'พัฒนาและทดสอบ', detail: 'พัฒนาพร้อมให้คุณดูความคืบหน้าได้ตลอด ทดสอบครบทุกขนาดหน้าจอ' },
      { title: 'ส่งมอบและสอนใช้งาน', detail: 'อบรมทีมคุณใช้ระบบหลังบ้าน พร้อมคู่มือและวิดีโอสอน' },
    ],
    processEn: [
      { title: 'Understand the business', detail: 'We talk to your team about customers, competitors, and measurable goals.' },
      { title: 'Structure and design', detail: 'Sitemap and real screen designs for approval before the first line of code.' },
      { title: 'Build and test', detail: 'Continuous progress previews, tested across every screen size.' },
      { title: 'Launch and train', detail: 'We train your team on the admin panel, with written and video guides.' },
    ],
    faqTh: [
      { question: 'ใช้เวลาทำนานแค่ไหน', answer: 'เว็บไซต์องค์กรทั่วไปใช้เวลา 4–8 สัปดาห์ ขึ้นกับจำนวนหน้าและความพร้อมของเนื้อหา' },
      { question: 'แก้เนื้อหาเองได้ไหม', answer: 'ได้ทุกหน้า เราส่งมอบพร้อมระบบหลังบ้านและอบรมทีมคุณจนใช้เป็น' },
      { question: 'มีค่าดูแลรายเดือนไหม', answer: 'สามเดือนแรกฟรี หลังจากนั้นเลือกแพ็กเกจดูแลได้ หรือจะดูแลเองก็ได้ เราไม่ล็อกระบบ' },
    ],
    faqEn: [
      { question: 'How long does it take?', answer: 'A typical corporate site takes 4–8 weeks, depending on page count and content readiness.' },
      { question: 'Can we edit content ourselves?', answer: 'Every page. We hand over the admin panel and train your team until they are comfortable.' },
      { question: 'Is there a monthly fee?', answer: 'The first three months are included. After that a care plan is optional — we never lock your system.' },
    ],
    packages: [
      {
        nameTh: 'Landing Page',
        nameEn: 'Landing Page',
        priceFrom: 35000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['หน้าเดียวจบ ออกแบบเฉพาะ', 'ฟอร์มติดต่อ + แจ้งเตือนอีเมล', 'ตั้งค่า SEO พื้นฐาน', 'รองรับมือถือเต็มรูปแบบ'],
        includesEn: ['Single custom-designed page', 'Contact form with email alerts', 'Basic SEO setup', 'Fully responsive'],
        order: 1,
      },
      {
        nameTh: 'เว็บไซต์องค์กร',
        nameEn: 'Corporate Site',
        priceFrom: 85000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['5–10 หน้า ออกแบบเฉพาะ', 'ระบบหลังบ้านสองภาษา', 'บล็อก/ข่าวสาร', 'SEO + Analytics ครบ', 'ดูแล 3 เดือน'],
        includesEn: ['5–10 custom pages', 'Bilingual admin panel', 'Blog and news module', 'Full SEO + analytics', '3 months support'],
        isPopular: true,
        order: 2,
      },
      {
        nameTh: 'เว็บไซต์ขนาดใหญ่',
        nameEn: 'Enterprise Site',
        priceFrom: 200000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['จำนวนหน้าไม่จำกัด', 'เชื่อมต่อระบบภายในองค์กร', 'จัดการสิทธิ์ผู้ใช้หลายระดับ', 'ดูแล 12 เดือน + SLA'],
        includesEn: ['Unlimited pages', 'Internal system integrations', 'Multi-level user permissions', '12 months support + SLA'],
        order: 3,
      },
    ],
  },
  {
    slug: 'web-app',
    category: ServiceCategory.WEB_APP,
    icon: 'LayoutDashboard',
    titleTh: 'เว็บแอปพลิเคชัน',
    titleEn: 'Web Applications',
    taglineTh: 'ระบบที่ทำตามวิธีทำงานของคุณ ไม่ใช่บังคับให้คุณทำตามระบบ',
    taglineEn: 'Internal systems shaped around how your team actually works',
    descriptionTh:
      'ระบบจัดการคลัง ระบบจองคิว แดชบอร์ดผู้บริหาร หรือระบบที่ยังไม่มีใครทำขาย เราสร้างให้ตรงกับกระบวนการของคุณ ไม่ใช่บังคับให้คุณเปลี่ยนวิธีทำงานตามซอฟต์แวร์สำเร็จรูป',
    descriptionEn:
      'Inventory systems, booking platforms, executive dashboards, or something nobody sells off the shelf. We build around your process instead of forcing your team to bend around someone else’s software.',
    highlightsTh: [
      'ออกแบบฐานข้อมูลและสิทธิ์การใช้งานอย่างรัดกุม',
      'รองรับผู้ใช้พร้อมกันจำนวนมาก',
      'ส่งออกรายงาน Excel / PDF',
      'ส่งมอบพร้อมเอกสารและโค้ดทั้งหมด',
    ],
    highlightsEn: [
      'Carefully designed data model and permissions',
      'Built for concurrent users',
      'Excel / PDF report exports',
      'Full source code and documentation handover',
    ],
    processTh: [
      { title: 'สำรวจกระบวนการทำงาน', detail: 'นั่งดูวิธีทำงานจริงของทีม จับจุดที่เสียเวลาและจุดที่ผิดพลาดบ่อย' },
      { title: 'ออกแบบระบบและฐานข้อมูล', detail: 'วางโครงข้อมูล สิทธิ์ผู้ใช้ และหน้าจอหลัก ให้อนุมัติก่อนเริ่มพัฒนา' },
      { title: 'พัฒนาเป็นรอบ', detail: 'ส่งงานให้ทดลองใช้ทุก 2 สัปดาห์ ปรับตามฟีดแบ็กจริงระหว่างทาง' },
      { title: 'ย้ายข้อมูลและเปิดใช้', detail: 'ย้ายข้อมูลเดิม อบรมผู้ใช้ และเฝ้าระบบช่วงแรกอย่างใกล้ชิด' },
    ],
    processEn: [
      { title: 'Map the workflow', detail: 'We observe how the team really works and find the time sinks and error-prone steps.' },
      { title: 'Design system and data', detail: 'Data model, permissions, and key screens approved before development starts.' },
      { title: 'Build in cycles', detail: 'Working builds every two weeks, adjusted against real feedback.' },
      { title: 'Migrate and go live', detail: 'Data migration, user training, and close monitoring through the first weeks.' },
    ],
    faqTh: [
      { question: 'ระบบเป็นของเราไหม', answer: 'เป็นของคุณทั้งหมด ทั้งโค้ดและข้อมูล เราส่งมอบ repository ให้ครบ' },
      { question: 'เพิ่มฟีเจอร์ทีหลังได้ไหม', answer: 'ได้ เราออกแบบเผื่อการต่อยอดไว้ตั้งแต่แรก และมีเอกสารให้ทีมอื่นทำต่อได้' },
    ],
    faqEn: [
      { question: 'Do we own the system?', answer: 'Entirely — code and data. We hand over the full repository.' },
      { question: 'Can features be added later?', answer: 'Yes. We design for extension and document it so any team can continue the work.' },
    ],
    packages: [
      {
        nameTh: 'ระบบขนาดเล็ก',
        nameEn: 'Compact System',
        priceFrom: 120000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['3–5 โมดูลหลัก', 'ผู้ใช้ 2 ระดับสิทธิ์', 'รายงานพื้นฐาน', 'ดูแล 3 เดือน'],
        includesEn: ['3–5 core modules', 'Two permission levels', 'Standard reports', '3 months support'],
        order: 1,
      },
      {
        nameTh: 'ระบบธุรกิจ',
        nameEn: 'Business Platform',
        priceFrom: 350000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['โมดูลตามที่ตกลง', 'สิทธิ์ผู้ใช้หลายระดับ', 'แดชบอร์ดและรายงานเชิงลึก', 'เชื่อมต่อ API ภายนอก', 'ดูแล 6 เดือน'],
        includesEn: ['Scoped module set', 'Multi-level permissions', 'Dashboards and deep reporting', 'External API integrations', '6 months support'],
        isPopular: true,
        order: 2,
      },
      {
        nameTh: 'ประเมินตามขอบเขต',
        nameEn: 'Scoped Estimate',
        priceUnit: PriceUnit.CUSTOM,
        includesTh: ['เวิร์กช็อปเก็บความต้องการ', 'เอกสารขอบเขตงานละเอียด', 'ประเมินราคาและระยะเวลา'],
        includesEn: ['Requirements workshop', 'Detailed scope document', 'Cost and timeline estimate'],
        order: 3,
      },
    ],
  },
  {
    slug: 'mobile-app',
    category: ServiceCategory.MOBILE_APP,
    icon: 'Smartphone',
    titleTh: 'แอปพลิเคชันมือถือ',
    titleEn: 'Mobile Applications',
    taglineTh: 'แอปขึ้นทั้ง iOS และ Android เราส่งขึ้นสโตร์ให้จนผ่าน',
    taglineEn: 'One codebase, both stores, all the way to publication',
    descriptionTh:
      'พัฒนาแอปด้วย React Native ทำให้ได้ทั้ง iOS และ Android จากโค้ดชุดเดียว ประหยัดทั้งงบและเวลาดูแลระยะยาว เราดูแลตั้งแต่ออกแบบจนถึงผ่านการตรวจของ App Store และ Google Play',
    descriptionEn:
      'React Native gives you iOS and Android from a single codebase, cutting both budget and long-term maintenance. We handle everything from design through App Store and Google Play review.',
    highlightsTh: [
      'ขึ้นทั้ง App Store และ Google Play',
      'แจ้งเตือนแบบ push',
      'ใช้งานออฟไลน์ได้ในส่วนที่จำเป็น',
      'อัปเดตแอปได้โดยไม่ต้องรอสโตร์ตรวจ',
    ],
    highlightsEn: [
      'Published to both App Store and Google Play',
      'Push notifications',
      'Offline support where it matters',
      'Over-the-air updates without store review',
    ],
    processTh: [
      { title: 'กำหนดขอบเขตและ flow', detail: 'ระบุฟีเจอร์ที่จำเป็นจริงสำหรับเวอร์ชันแรก ตัดสิ่งที่รอได้ออกไปก่อน' },
      { title: 'ออกแบบ UI ตามแพลตฟอร์ม', detail: 'ออกแบบให้เข้ากับพฤติกรรมผู้ใช้ทั้ง iOS และ Android' },
      { title: 'พัฒนาและทดสอบบนเครื่องจริง', detail: 'แจกให้ทดสอบผ่าน TestFlight และ Play Console ระหว่างทาง' },
      { title: 'ส่งขึ้นสโตร์', detail: 'เตรียมภาพ คำอธิบาย นโยบายความเป็นส่วนตัว และแก้ตามที่สโตร์ขอจนผ่าน' },
    ],
    processEn: [
      { title: 'Scope and flows', detail: 'Identify what version one truly needs and defer everything that can wait.' },
      { title: 'Platform-aware UI', detail: 'Designed for how iOS and Android users each expect apps to behave.' },
      { title: 'Build and device testing', detail: 'Distributed through TestFlight and Play Console throughout development.' },
      { title: 'Store submission', detail: 'Assets, descriptions, privacy policy, and review revisions until approved.' },
    ],
    faqTh: [
      { question: 'ต้องมีบัญชีนักพัฒนาไหม', answer: 'ต้องมีในชื่อบริษัทคุณ (Apple ปีละ 99 USD, Google ครั้งเดียว 25 USD) เราช่วยตั้งค่าให้' },
      { question: 'ใช้เวลานานแค่ไหน', answer: 'แอปเวอร์ชันแรกทั่วไป 8–16 สัปดาห์ รวมเวลารอสโตร์ตรวจ' },
    ],
    faqEn: [
      { question: 'Do we need developer accounts?', answer: 'Yes, under your company name (Apple $99/year, Google $25 once). We set them up with you.' },
      { question: 'How long does it take?', answer: 'A typical first version takes 8–16 weeks, including store review time.' },
    ],
    packages: [
      {
        nameTh: 'แอปเวอร์ชันแรก',
        nameEn: 'MVP App',
        priceFrom: 250000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['iOS + Android', '5–8 หน้าจอหลัก', 'ระบบสมาชิก', 'ส่งขึ้นสโตร์ให้'],
        includesEn: ['iOS + Android', '5–8 core screens', 'User accounts', 'Store submission included'],
        isPopular: true,
        order: 1,
      },
      {
        nameTh: 'แอปเต็มรูปแบบ',
        nameEn: 'Full Product',
        priceFrom: 600000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['ฟีเจอร์ตามขอบเขต', 'ระบบชำระเงิน', 'แจ้งเตือน push', 'แดชบอร์ดหลังบ้าน', 'ดูแล 6 เดือน'],
        includesEn: ['Scoped feature set', 'Payment integration', 'Push notifications', 'Admin dashboard', '6 months support'],
        order: 2,
      },
    ],
  },
  {
    slug: 'photography',
    category: ServiceCategory.PHOTOGRAPHY,
    icon: 'Camera',
    titleTh: 'งานถ่ายภาพ',
    titleEn: 'Photography',
    taglineTh: 'ภาพที่ขายของได้ ไม่ใช่แค่ภาพที่สวย',
    taglineEn: 'Images that sell, not just images that look nice',
    descriptionTh:
      'ถ่ายภาพสินค้า อาหาร บุคคล และงานอีเวนต์ ด้วยการจัดแสงที่คุมได้ทุกเงื่อนไข ส่งไฟล์รีทัชครบพร้อมสัดส่วนสำหรับทุกแพลตฟอร์ม ตั้งแต่หน้าเว็บจนถึงสตอรี่',
    descriptionEn:
      'Product, food, portrait, and event photography with lighting we control in any condition. Delivered fully retouched and cropped for every platform, from your website hero to a vertical story.',
    highlightsTh: [
      'จัดแสงในสตูดิโอและนอกสถานที่',
      'รีทัชระดับใช้งานพาณิชย์',
      'ส่งไฟล์ครบทุกสัดส่วนที่ต้องใช้',
      'ส่งงานภายใน 5 วันทำการ',
    ],
    highlightsEn: [
      'Studio and on-location lighting',
      'Commercial-grade retouching',
      'Every crop ratio you need',
      'Delivered within 5 business days',
    ],
    processTh: [
      { title: 'วางแผนภาพที่ต้องใช้', detail: 'ตกลงรายการภาพ อารมณ์ และปลายทางการใช้งานให้ชัดก่อนวันถ่าย' },
      { title: 'เตรียมงานและจัดฉาก', detail: 'จัดหาพร็อพ จัดฉาก และทดสอบแสงล่วงหน้า' },
      { title: 'วันถ่ายจริง', detail: 'ดูภาพผ่านจอระหว่างถ่าย อนุมัติหน้างานได้ทันที' },
      { title: 'คัดและรีทัช', detail: 'คัดภาพให้เลือก แล้วรีทัชละเอียดเฉพาะภาพที่เลือก' },
    ],
    processEn: [
      { title: 'Plan the shot list', detail: 'Agree on images, mood, and end usage before the shoot day.' },
      { title: 'Prep and styling', detail: 'Props, set dressing, and lighting tested in advance.' },
      { title: 'Shoot day', detail: 'Tethered preview on a monitor so you can approve on the spot.' },
      { title: 'Select and retouch', detail: 'You pick from a curated selection; we retouch only what you chose.' },
    ],
    faqTh: [
      { question: 'ได้ภาพกี่รูป', answer: 'ขึ้นกับแพ็กเกจ ครึ่งวันได้ภาพรีทัช 15–20 รูป เต็มวัน 35–50 รูป' },
      { question: 'ใช้ภาพในโฆษณาได้ไหม', answer: 'ได้ทุกแพ็กเกจ คุณได้สิทธิ์ใช้งานเชิงพาณิชย์แบบไม่จำกัดระยะเวลา' },
    ],
    faqEn: [
      { question: 'How many images do we get?', answer: 'Depends on the package — 15–20 retouched for a half day, 35–50 for a full day.' },
      { question: 'Can we use them in ads?', answer: 'Yes, on every package. You get unlimited commercial usage rights.' },
    ],
    packages: [
      {
        nameTh: 'ครึ่งวัน',
        nameEn: 'Half Day',
        priceFrom: 8000,
        priceUnit: PriceUnit.HALF_DAY,
        includesTh: ['ถ่าย 4 ชั่วโมง', 'ภาพรีทัช 15–20 รูป', 'ช่างภาพ 1 คน', 'ส่งงานใน 5 วัน'],
        includesEn: ['4 hour shoot', '15–20 retouched images', 'One photographer', '5 day delivery'],
        order: 1,
      },
      {
        nameTh: 'เต็มวัน',
        nameEn: 'Full Day',
        priceFrom: 15000,
        priceUnit: PriceUnit.DAY,
        includesTh: ['ถ่าย 8 ชั่วโมง', 'ภาพรีทัช 35–50 รูป', 'ช่างภาพ + ผู้ช่วย', 'จัดแสงเต็มชุด', 'ส่งงานใน 5 วัน'],
        includesEn: ['8 hour shoot', '35–50 retouched images', 'Photographer + assistant', 'Full lighting kit', '5 day delivery'],
        isPopular: true,
        order: 2,
      },
      {
        nameTh: 'แพ็กเกจรายเดือน',
        nameEn: 'Monthly Retainer',
        priceFrom: 45000,
        priceUnit: PriceUnit.MONTH,
        includesTh: ['ถ่าย 4 ครึ่งวันต่อเดือน', 'ภาพรีทัช 60+ รูป', 'คิวถ่ายจองล่วงหน้าได้', 'ราคาต่อภาพถูกที่สุด'],
        includesEn: ['Four half-days per month', '60+ retouched images', 'Priority scheduling', 'Lowest cost per image'],
        order: 3,
      },
    ],
  },
  {
    slug: 'video',
    category: ServiceCategory.VIDEO,
    icon: 'Clapperboard',
    titleTh: 'งานวิดีโอ',
    titleEn: 'Video Production',
    taglineTh: 'ตั้งแต่คิดบทจนได้ไฟล์ ไม่ต้องต่อสายหาใครเพิ่ม',
    taglineEn: 'Script to final file, handled by one team',
    descriptionTh:
      'วิดีโอโฆษณา สารคดีองค์กร คอนเทนต์โซเชียล และงานอีเวนต์ เราดูแลครบตั้งแต่เขียนบท ถ่ายทำ ตัดต่อ ปรับสี ทำเสียง จนถึงส่งไฟล์ในสัดส่วนที่แต่ละแพลตฟอร์มต้องการ',
    descriptionEn:
      'Commercials, corporate documentaries, social content, and event coverage. Scripting, shooting, editing, colour grading, and sound — delivered in the aspect ratio each platform actually needs.',
    highlightsTh: [
      'เขียนบทและวาง storyboard',
      'ถ่ายด้วยกล้องระดับซีเนม่า',
      'ปรับสีและมิกซ์เสียงมืออาชีพ',
      'ส่งไฟล์ทั้งแนวนอนและแนวตั้ง',
    ],
    highlightsEn: [
      'Scripting and storyboarding',
      'Cinema-grade camera packages',
      'Professional grade and sound mix',
      'Both landscape and vertical deliverables',
    ],
    processTh: [
      { title: 'พัฒนาบทและ storyboard', detail: 'ตกลงสารที่ต้องการสื่อ แล้ววางเป็นบทและภาพร่างทีละช็อต' },
      { title: 'เตรียมการผลิต', detail: 'หาสถานที่ นักแสดง คิวถ่าย และรายการอุปกรณ์' },
      { title: 'วันถ่ายทำ', detail: 'ทีมงานครบ ควบคุมแสงและเสียงตามมาตรฐานงานโฆษณา' },
      { title: 'ตัดต่อและส่งมอบ', detail: 'ให้ดูฉบับร่าง แก้ได้ 2 รอบ แล้วส่งไฟล์ครบทุกสัดส่วน' },
    ],
    processEn: [
      { title: 'Script and storyboard', detail: 'Agree the message, then break it down shot by shot.' },
      { title: 'Pre-production', detail: 'Locations, talent, schedule, and equipment list.' },
      { title: 'Shoot day', detail: 'Full crew with commercial-standard lighting and sound.' },
      { title: 'Post and delivery', detail: 'Draft cut, two revision rounds, then every required aspect ratio.' },
    ],
    faqTh: [
      { question: 'แก้งานได้กี่รอบ', answer: 'รวมในราคา 2 รอบ รอบถัดไปคิดตามชั่วโมงที่ใช้จริง' },
      { question: 'มีค่าลิขสิทธิ์เพลงไหม', answer: 'รวมเพลงที่ซื้อสิทธิ์แล้วให้ ถ้าต้องการเพลงเฉพาะจะเสนอราคาแยก' },
    ],
    faqEn: [
      { question: 'How many revision rounds?', answer: 'Two are included. Further rounds are billed at actual hours.' },
      { question: 'Are music rights included?', answer: 'Licensed library music is included. Custom scoring is quoted separately.' },
    ],
    packages: [
      {
        nameTh: 'คอนเทนต์โซเชียล',
        nameEn: 'Social Content',
        priceFrom: 25000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['วิดีโอ 30–60 วินาที', 'ถ่ายครึ่งวัน', 'ตัดต่อ + ซับไตเติล', 'ส่งทั้ง 16:9 และ 9:16'],
        includesEn: ['30–60 second video', 'Half day shoot', 'Edit + subtitles', 'Both 16:9 and 9:16'],
        order: 1,
      },
      {
        nameTh: 'วิดีโอองค์กร',
        nameEn: 'Corporate Film',
        priceFrom: 80000,
        priceUnit: PriceUnit.PROJECT,
        includesTh: ['วิดีโอ 2–3 นาที', 'ถ่าย 1–2 วัน', 'เขียนบท + สัมภาษณ์', 'ปรับสี + มิกซ์เสียง', 'ตัดสั้นแถม 3 คลิป'],
        includesEn: ['2–3 minute film', '1–2 shoot days', 'Scripting + interviews', 'Grade + sound mix', 'Three bonus short cuts'],
        isPopular: true,
        order: 2,
      },
      {
        nameTh: 'งานโฆษณา',
        nameEn: 'Commercial',
        priceUnit: PriceUnit.CUSTOM,
        includesTh: ['ทีมงานเต็มรูปแบบ', 'นักแสดงและสถานที่', 'อุปกรณ์ระดับซีเนม่า', 'ประเมินราคาตามบท'],
        includesEn: ['Full crew', 'Talent and locations', 'Cinema equipment package', 'Quoted from the script'],
        order: 3,
      },
    ],
  },
  {
    slug: 'studio',
    category: ServiceCategory.STUDIO,
    icon: 'Warehouse',
    titleTh: 'เช่าสตูดิโอ',
    titleEn: 'Studio Rental',
    taglineTh: 'ห้องถ่ายพร้อมไฟและฉาก จองเป็นชั่วโมงก็ได้',
    taglineEn: 'A shoot-ready space with lights and cyclorama, bookable by the hour',
    descriptionTh:
      'สตูดิโอเพดานสูงพร้อมฉากโค้งขาว ชุดไฟครบ ห้องแต่งตัว และที่จอดรถ เหมาะกับงานถ่ายสินค้า ถ่ายบุคคล ถ่ายวิดีโอ และไลฟ์สด จองเป็นชั่วโมงหรือเหมาวันก็ได้',
    descriptionEn:
      'A high-ceiling studio with a white cyclorama, full lighting kit, dressing room, and parking. Suited to product, portrait, video, and live streaming. Book by the hour or take the full day.',
    highlightsTh: [
      'ฉากโค้งขาวขนาด 6 × 4 เมตร',
      'ชุดไฟสตูดิโอพร้อมใช้',
      'ห้องแต่งตัวและห้องน้ำแยก',
      'อินเทอร์เน็ตความเร็วสูงและที่จอดรถ',
    ],
    highlightsEn: [
      '6 × 4 m white cyclorama',
      'Studio lighting kit included',
      'Private dressing room and bathroom',
      'High-speed internet and parking',
    ],
    processTh: [
      { title: 'เช็ควันว่าง', detail: 'ทักมาบอกวันและเวลาที่ต้องการ เราตอบกลับภายในวันเดียวกัน' },
      { title: 'ยืนยันการจอง', detail: 'มัดจำ 50% เพื่อล็อกคิว ที่เหลือชำระวันใช้งาน' },
      { title: 'วันใช้งาน', detail: 'เข้าใช้ได้ตามเวลาที่จอง มีทีมงานคอยช่วยเรื่องไฟและอุปกรณ์' },
    ],
    processEn: [
      { title: 'Check availability', detail: 'Send us your date and time; we reply the same day.' },
      { title: 'Confirm the booking', detail: '50% deposit holds the slot, balance due on the day.' },
      { title: 'Shoot day', detail: 'Access for your booked hours, with staff on hand for lighting and gear.' },
    ],
    faqTh: [
      { question: 'มีทีมงานช่วยไหม', answer: 'มีเจ้าหน้าที่ประจำช่วยเรื่องไฟและอุปกรณ์ ถ้าต้องการช่างภาพหรือผู้ช่วยเพิ่ม แจ้งล่วงหน้าได้' },
      { question: 'เอาอุปกรณ์มาเองได้ไหม', answer: 'ได้เลย และเช่าอุปกรณ์เพิ่มจากเราในราคาพิเศษเมื่อจองสตูดิโอด้วย' },
    ],
    faqEn: [
      { question: 'Is there support staff?', answer: 'A studio assistant helps with lighting and gear. Extra crew can be arranged in advance.' },
      { question: 'Can we bring our own gear?', answer: 'Absolutely — and studio bookings get a discount on our rental equipment.' },
    ],
    packages: [
      {
        nameTh: 'รายชั่วโมง',
        nameEn: 'Hourly',
        priceFrom: 1200,
        priceUnit: PriceUnit.HOUR,
        includesTh: ['ขั้นต่ำ 2 ชั่วโมง', 'ฉากโค้งขาว', 'ชุดไฟพื้นฐาน', 'เจ้าหน้าที่ประจำ'],
        includesEn: ['Two hour minimum', 'White cyclorama', 'Basic lighting kit', 'Studio assistant'],
        order: 1,
      },
      {
        nameTh: 'ครึ่งวัน',
        nameEn: 'Half Day',
        priceFrom: 4500,
        priceUnit: PriceUnit.HALF_DAY,
        includesTh: ['ใช้งาน 4 ชั่วโมง', 'ชุดไฟเต็ม', 'ห้องแต่งตัว', 'เครื่องดื่มบริการ'],
        includesEn: ['4 hours', 'Full lighting kit', 'Dressing room', 'Refreshments'],
        isPopular: true,
        order: 2,
      },
      {
        nameTh: 'เหมาวัน',
        nameEn: 'Full Day',
        priceFrom: 8000,
        priceUnit: PriceUnit.DAY,
        includesTh: ['ใช้งาน 9 ชั่วโมง', 'ชุดไฟเต็ม + ฉากเสริม', 'ห้องแต่งตัว', 'ส่วนลดค่าเช่าอุปกรณ์ 20%'],
        includesEn: ['9 hours', 'Full lighting + extra backdrops', 'Dressing room', '20% off equipment rental'],
        order: 3,
      },
    ],
  },
]

async function seedServices() {
  for (const [index, s] of services.entries()) {
    const { packages, ...service } = s
    const record = await prisma.service.upsert({
      where: { slug: service.slug },
      update: { ...service, order: index + 1 },
      create: { ...service, order: index + 1 },
    })

    await prisma.servicePackage.deleteMany({ where: { serviceId: record.id } })
    await prisma.servicePackage.createMany({
      data: packages.map((p) => ({ ...p, serviceId: record.id })),
    })
  }
  console.log(`✓ บริการ ${services.length} รายการ พร้อมแพ็กเกจราคา`)
}

const projects = [
  {
    slug: 'siriwat-group-corporate-site',
    category: ServiceCategory.WEB,
    titleTh: 'เว็บไซต์องค์กร ศิริวัฒน์ กรุ๊ป',
    titleEn: 'Siriwat Group Corporate Site',
    summaryTh: 'รื้อเว็บไซต์อายุ 9 ปีของกลุ่มธุรกิจก่อสร้าง ให้โหลดเร็วขึ้น 4 เท่าและทีมการตลาดแก้เนื้อหาเองได้',
    summaryEn: 'Rebuilt a nine-year-old construction group site to load four times faster, with content the marketing team owns.',
    clientName: 'Siriwat Group',
    year: 2025,
    techStack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
    liveUrl: 'https://example.com',
    isFeatured: true,
    gallery: 4,
  },
  {
    slug: 'thonglor-clinic-booking',
    category: ServiceCategory.WEB_APP,
    titleTh: 'ระบบจองคิว คลินิกทองหล่อ',
    titleEn: 'Thonglor Clinic Booking System',
    summaryTh: 'ระบบนัดหมายและเวชระเบียนที่ลดเวลาลงทะเบียนหน้าเคาน์เตอร์จาก 12 นาทีเหลือ 3 นาที',
    summaryEn: 'An appointment and records system that cut front-desk check-in from twelve minutes to three.',
    clientName: 'Thonglor Clinic',
    year: 2025,
    techStack: ['Next.js', 'Prisma', 'PostgreSQL', 'Resend'],
    isFeatured: true,
    gallery: 3,
  },
  {
    slug: 'baan-suan-delivery-app',
    category: ServiceCategory.MOBILE_APP,
    titleTh: 'แอปสั่งอาหาร บ้านสวน',
    titleEn: 'Baan Suan Delivery App',
    summaryTh: 'แอปสั่งอาหารของร้านอาหารเครือ 8 สาขา ที่ตัดค่าคอมมิชชั่นแพลตฟอร์มออกไปทั้งหมด',
    summaryEn: 'An in-house ordering app for an eight-branch restaurant group that removed platform commissions entirely.',
    clientName: 'Baan Suan Restaurant',
    year: 2024,
    techStack: ['React Native', 'Expo', 'Node.js', 'Stripe'],
    gallery: 3,
  },
  {
    slug: 'sarn-ceramics-product-shoot',
    category: ServiceCategory.PHOTOGRAPHY,
    titleTh: 'ถ่ายภาพสินค้า สารน์ เซรามิก',
    titleEn: 'Sarn Ceramics Product Shoot',
    summaryTh: 'ภาพสินค้า 120 ชิ้นสำหรับแคตตาล็อกและร้านค้าออนไลน์ ถ่ายเสร็จใน 3 วัน',
    summaryEn: 'A 120-piece catalogue and e-commerce shoot completed across three days.',
    clientName: 'Sarn Ceramics',
    year: 2025,
    isFeatured: true,
    gallery: 6,
  },
  {
    slug: 'chiangmai-coffee-brand-film',
    category: ServiceCategory.VIDEO,
    titleTh: 'หนังแบรนด์ กาแฟเชียงใหม่',
    titleEn: 'Chiang Mai Coffee Brand Film',
    summaryTh: 'สารคดีสั้น 3 นาที ตามรอยเมล็ดกาแฟจากไร่บนดอยถึงแก้วในเมือง',
    summaryEn: 'A three-minute short following the bean from a hillside farm to a cup in the city.',
    clientName: 'Doi Chang Coffee',
    year: 2025,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    isFeatured: true,
    gallery: 4,
  },
  {
    slug: 'aurora-fashion-lookbook',
    category: ServiceCategory.PHOTOGRAPHY,
    titleTh: 'ลุคบุ๊ก Aurora Fashion',
    titleEn: 'Aurora Fashion Lookbook',
    summaryTh: 'ถ่ายลุคบุ๊กคอลเลกชันฤดูฝนในสตูดิโอ พร้อมคลิปสั้นสำหรับโซเชียล',
    summaryEn: 'A rainy-season collection lookbook shot in studio, with social cutdowns.',
    clientName: 'Aurora',
    year: 2024,
    gallery: 5,
  },
  {
    slug: 'sme-expo-event-coverage',
    category: ServiceCategory.VIDEO,
    titleTh: 'บันทึกงาน SME Expo 2025',
    titleEn: 'SME Expo 2025 Coverage',
    summaryTh: 'ถ่ายทำงานสัมมนา 2 วัน ส่งไฮไลต์รายวันภายในเช้าวันถัดไป',
    summaryEn: 'Two days of conference coverage with daily highlight reels delivered by the next morning.',
    clientName: 'Thai SME Association',
    year: 2025,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    gallery: 4,
  },
  {
    slug: 'alexan-studio-space',
    category: ServiceCategory.STUDIO,
    titleTh: 'สตูดิโอ Alexan',
    titleEn: 'The Alexan Studio',
    summaryTh: 'พื้นที่ถ่ายทำ 120 ตารางเมตร เพดานสูง 4.5 เมตร พร้อมฉากโค้งขาวและชุดไฟครบ',
    summaryEn: 'A 120 sqm shoot space with 4.5 m ceilings, white cyclorama, and a full lighting kit.',
    year: 2024,
    isFeatured: true,
    gallery: 6,
  },
]

async function seedProjects(authorId: string | null) {
  const serviceMap = new Map(
    (await prisma.service.findMany({ select: { id: true, category: true } })).map((s) => [
      s.category,
      s.id,
    ]),
  )

  for (const [index, p] of projects.entries()) {
    const { gallery, ...data } = p
    const record = await prisma.project.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        summaryTh: data.summaryTh,
        summaryEn: data.summaryEn,
        coverImage: img(`${data.slug}-cover`),
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(Date.now() - index * 86_400_000 * 12),
        order: index + 1,
        serviceId: serviceMap.get(data.category) ?? null,
        authorId,
      },
    })

    const existingMedia = await prisma.projectMedia.count({ where: { projectId: record.id } })
    if (existingMedia === 0) {
      await prisma.projectMedia.createMany({
        data: Array.from({ length: gallery }, (_, i) => ({
          projectId: record.id,
          url: img(`${data.slug}-${i}`, 1400, i % 3 === 0 ? 1750 : 950),
          width: 1400,
          height: i % 3 === 0 ? 1750 : 950,
          order: i,
        })),
      })
    }
  }
  console.log(`✓ ผลงาน ${projects.length} ชิ้น พร้อมรูปในแกลเลอรี`)
}

const equipment = [
  { slug: 'sony-fx3', category: EquipmentCategory.CAMERA, brand: 'Sony', model: 'FX3', nameTh: 'กล้องซีเนม่า Sony FX3', nameEn: 'Sony FX3 Cinema Camera', dailyRate: 3500, depositAmount: 20000, specs: [{ label: 'เซนเซอร์', value: 'Full-frame 10.2MP' }, { label: 'ความละเอียด', value: '4K 120fps' }, { label: 'ISO', value: 'Dual Base 800 / 12800' }, { label: 'เมาท์', value: 'Sony E' }], isFeatured: true },
  { slug: 'sony-a7iv', category: EquipmentCategory.CAMERA, brand: 'Sony', model: 'A7 IV', nameTh: 'กล้อง Sony A7 IV', nameEn: 'Sony A7 IV', dailyRate: 2000, depositAmount: 15000, specs: [{ label: 'เซนเซอร์', value: 'Full-frame 33MP' }, { label: 'วิดีโอ', value: '4K 60fps' }, { label: 'เมาท์', value: 'Sony E' }] },
  { slug: 'canon-r5', category: EquipmentCategory.CAMERA, brand: 'Canon', model: 'EOS R5', nameTh: 'กล้อง Canon EOS R5', nameEn: 'Canon EOS R5', dailyRate: 2500, depositAmount: 18000, specs: [{ label: 'เซนเซอร์', value: 'Full-frame 45MP' }, { label: 'วิดีโอ', value: '8K RAW' }, { label: 'เมาท์', value: 'Canon RF' }], isFeatured: true },
  { slug: 'sony-24-70-gm2', category: EquipmentCategory.LENS, brand: 'Sony', model: 'FE 24-70mm f/2.8 GM II', nameTh: 'เลนส์ซูม 24-70mm f/2.8', nameEn: '24-70mm f/2.8 Zoom Lens', dailyRate: 1200, depositAmount: 10000, specs: [{ label: 'ช่วงเลนส์', value: '24-70mm' }, { label: 'รูรับแสง', value: 'f/2.8 คงที่' }, { label: 'เมาท์', value: 'Sony E' }] },
  { slug: 'sony-70-200-gm2', category: EquipmentCategory.LENS, brand: 'Sony', model: 'FE 70-200mm f/2.8 GM II', nameTh: 'เลนส์เทเล 70-200mm f/2.8', nameEn: '70-200mm f/2.8 Telephoto', dailyRate: 1400, depositAmount: 12000, specs: [{ label: 'ช่วงเลนส์', value: '70-200mm' }, { label: 'รูรับแสง', value: 'f/2.8 คงที่' }, { label: 'กันสั่น', value: 'มี' }] },
  { slug: 'sigma-art-35', category: EquipmentCategory.LENS, brand: 'Sigma', model: '35mm f/1.4 DG DN Art', nameTh: 'เลนส์ไพรม์ 35mm f/1.4', nameEn: '35mm f/1.4 Prime', dailyRate: 700, depositAmount: 6000, specs: [{ label: 'ทางยาวโฟกัส', value: '35mm' }, { label: 'รูรับแสง', value: 'f/1.4' }] },
  { slug: 'aputure-600d', category: EquipmentCategory.LIGHTING, brand: 'Aputure', model: 'LS 600d Pro', nameTh: 'ไฟต่อเนื่อง Aputure 600d Pro', nameEn: 'Aputure 600d Pro LED', dailyRate: 1800, depositAmount: 15000, specs: [{ label: 'กำลังไฟ', value: '600W' }, { label: 'อุณหภูมิสี', value: '5600K' }, { label: 'CRI', value: '96+' }], isFeatured: true },
  { slug: 'godox-ad600', category: EquipmentCategory.LIGHTING, brand: 'Godox', model: 'AD600 Pro', nameTh: 'แฟลชสตูดิโอ Godox AD600 Pro', nameEn: 'Godox AD600 Pro Strobe', dailyRate: 900, depositAmount: 8000, specs: [{ label: 'กำลังไฟ', value: '600Ws' }, { label: 'แบตเตอรี่', value: 'ยิงได้ 360 ครั้ง' }] },
  { slug: 'rode-wireless-pro', category: EquipmentCategory.AUDIO, brand: 'Rode', model: 'Wireless PRO', nameTh: 'ไมค์ไร้สาย Rode Wireless PRO', nameEn: 'Rode Wireless PRO Mic Kit', dailyRate: 600, depositAmount: 5000, specs: [{ label: 'จำนวนช่อง', value: '2 ตัวส่ง' }, { label: 'ระยะ', value: '260 เมตร' }, { label: 'บันทึกสำรอง', value: 'ในตัว 32-bit float' }] },
  { slug: 'zoom-h6', category: EquipmentCategory.AUDIO, brand: 'Zoom', model: 'H6', nameTh: 'เครื่องบันทึกเสียง Zoom H6', nameEn: 'Zoom H6 Field Recorder', dailyRate: 400, depositAmount: 3000, specs: [{ label: 'ช่องรับ', value: '6 ช่อง' }, { label: 'ความละเอียด', value: '24-bit / 96kHz' }] },
  { slug: 'dji-rs4-pro', category: EquipmentCategory.GRIP, brand: 'DJI', model: 'RS 4 Pro', nameTh: 'กิมบอล DJI RS 4 Pro', nameEn: 'DJI RS 4 Pro Gimbal', dailyRate: 1000, depositAmount: 10000, specs: [{ label: 'รับน้ำหนัก', value: '4.5 กก.' }, { label: 'แบตเตอรี่', value: '13 ชั่วโมง' }] },
  { slug: 'manfrotto-504x', category: EquipmentCategory.GRIP, brand: 'Manfrotto', model: '504X + 645 Fast', nameTh: 'ขาตั้งกล้องวิดีโอ Manfrotto 504X', nameEn: 'Manfrotto 504X Video Tripod', dailyRate: 500, depositAmount: 4000, specs: [{ label: 'รับน้ำหนัก', value: '12 กก.' }, { label: 'ความสูงสูงสุด', value: '166 ซม.' }] },
  { slug: 'dji-mavic-3-pro', category: EquipmentCategory.DRONE, brand: 'DJI', model: 'Mavic 3 Pro', nameTh: 'โดรน DJI Mavic 3 Pro', nameEn: 'DJI Mavic 3 Pro Drone', dailyRate: 2200, depositAmount: 20000, specs: [{ label: 'กล้อง', value: 'Hasselblad 4/3 CMOS' }, { label: 'วิดีโอ', value: '5.1K 50fps' }, { label: 'บินได้', value: '43 นาที' }], isFeatured: true },
  { slug: 'sandisk-cfexpress-256', category: EquipmentCategory.ACCESSORY, brand: 'SanDisk', model: 'CFexpress Type A 256GB', nameTh: 'การ์ดความจำ CFexpress 256GB', nameEn: 'CFexpress Type A 256GB Card', dailyRate: 250, depositAmount: 3000, specs: [{ label: 'ความจุ', value: '256GB' }, { label: 'ความเร็วเขียน', value: '700 MB/s' }] },
]

async function seedEquipment() {
  for (const [index, e] of equipment.entries()) {
    await prisma.equipment.upsert({
      where: { slug: e.slug },
      update: { dailyRate: e.dailyRate, depositAmount: e.depositAmount },
      create: {
        ...e,
        descriptionTh: `${e.brand} ${e.model} พร้อมกระเป๋าและอุปกรณ์เสริมมาตรฐาน ตรวจสภาพก่อนส่งมอบทุกครั้ง`,
        descriptionEn: `${e.brand} ${e.model} with case and standard accessories. Inspected before every handover.`,
        image: img(`gear-${e.slug}`, 1200, 900),
        order: index + 1,
      },
    })
  }
  console.log(`✓ อุปกรณ์ให้เช่า ${equipment.length} รายการ`)
}

const reviews = [
  { authorName: 'ณัฐพงษ์ วิริยะกุล', authorRole: 'ผู้จัดการการตลาด · Siriwat Group', rating: 5, serviceCategory: ServiceCategory.WEB, locale: 'th', content: 'เว็บเดิมของเราโหลดช้ามากจนลูกค้าบ่น ทีม Alexan รื้อใหม่ทั้งหมดและอธิบายทุกขั้นตอนให้เราเข้าใจ ตอนนี้ทีมการตลาดแก้เนื้อหาเองได้โดยไม่ต้องรอใคร คุ้มค่ามาก' },
  { authorName: 'Sarah Whitmore', authorRole: 'Founder · Aurora', rating: 5, serviceCategory: ServiceCategory.PHOTOGRAPHY, locale: 'en', content: 'They understood the collection before we even finished explaining it. The lookbook shots needed almost no revision, and the social cutdowns they threw in became our best performing posts of the season.' },
  { authorName: 'ปิยะดา แสงทอง', authorRole: 'เจ้าของร้าน · สารน์ เซรามิก', rating: 5, serviceCategory: ServiceCategory.PHOTOGRAPHY, locale: 'th', content: 'สินค้า 120 ชิ้นถ่ายเสร็จใน 3 วันตามที่สัญญาไว้ ภาพสวยกว่าที่คิดไว้เยอะ ยอดขายออนไลน์ขึ้นเห็นได้ชัดหลังเปลี่ยนรูป' },
  { authorName: 'ธนกฤต อารีย์วงศ์', authorRole: 'ผู้อำนวยการ · คลินิกทองหล่อ', rating: 5, serviceCategory: ServiceCategory.WEB_APP, locale: 'th', content: 'ก่อนหน้านี้ใช้กระดาษกับ Excel ปนกัน ทีมนี้มานั่งดูวิธีทำงานเราจริง ๆ ก่อนออกแบบระบบ ผลคือพนักงานใช้เป็นตั้งแต่วันแรก ไม่ต้องอบรมซ้ำ' },
  { authorName: 'James Attwood', authorRole: 'Brand Director · Doi Chang Coffee', rating: 5, serviceCategory: ServiceCategory.VIDEO, locale: 'en', content: 'The brand film hit exactly the tone we wanted — warm, unhurried, honest. They handled a two-day mountain shoot in unpredictable weather without a single complaint.' },
  { authorName: 'มณีรัตน์ ชัยพัฒน์', authorRole: 'ช่างภาพอิสระ', rating: 4, serviceCategory: ServiceCategory.STUDIO, locale: 'th', content: 'สตูดิโอสะอาด ไฟครบ เจ้าหน้าที่ช่วยเหลือดีมาก ติดอย่างเดียวคือที่จอดรถเต็มบ่อยช่วงวันหยุด แนะนำให้มาเช้าหน่อย' },
  { authorName: 'สุรชัย พงศ์ภัทร', authorRole: 'ผู้จัดการฝ่ายผลิต · Baan Suan', rating: 5, serviceCategory: ServiceCategory.MOBILE_APP, locale: 'th', content: 'แอปที่ทำให้เราหยุดจ่ายค่าคอมมิชชั่นให้แพลตฟอร์มเดลิเวอรี คืนทุนภายใน 7 เดือน ทีมงานตอบเร็วและแก้ปัญหาให้ตลอดแม้หลังส่งมอบไปแล้ว' },
]

async function seedReviews() {
  const count = await prisma.review.count()
  if (count > 0) {
    console.log('• ข้ามรีวิว — มีข้อมูลอยู่แล้ว')
    return
  }
  await prisma.review.createMany({
    data: reviews.map((r, i) => ({
      ...r,
      status: ReviewStatus.APPROVED,
      isPinned: i < 2,
      approvedAt: new Date(Date.now() - i * 86_400_000 * 9),
      createdAt: new Date(Date.now() - i * 86_400_000 * 10),
    })),
  })
  console.log(`✓ รีวิว ${reviews.length} รายการ (อนุมัติแล้ว)`)
}

const posts = [
  {
    slug: 'how-much-does-a-website-cost-thailand',
    titleTh: 'ทำเว็บไซต์ราคาเท่าไหร่ และทำไมใบเสนอราคาถึงต่างกันสิบเท่า',
    titleEn: 'What a website really costs, and why quotes differ tenfold',
    excerptTh: 'จาก 5,000 ถึง 500,000 บาท ทำไมช่วงราคาถึงกว้างขนาดนี้ และคุณกำลังจ่ายเงินให้อะไรกันแน่',
    excerptEn: 'From 5,000 to 500,000 baht — why the range is so wide, and what you are actually paying for.',
    tags: ['เว็บไซต์', 'ราคา', 'ธุรกิจ'],
    readingMinutes: 8,
    isFeatured: true,
  },
  {
    slug: 'product-photography-checklist',
    titleTh: 'เช็กลิสต์ก่อนถ่ายภาพสินค้า ที่ช่วยประหยัดเงินคุณได้ครึ่งหนึ่ง',
    titleEn: 'The product shoot checklist that can halve your bill',
    excerptTh: 'งานถ่ายภาพส่วนใหญ่บานปลายเพราะเตรียมของไม่พร้อม ไม่ใช่เพราะช่างภาพคิดแพง',
    excerptEn: 'Most shoots run over budget because of preparation, not because the photographer overcharged.',
    tags: ['ถ่ายภาพ', 'เตรียมงาน'],
    readingMinutes: 6,
  },
  {
    slug: 'choosing-between-web-app-and-mobile-app',
    titleTh: 'ธุรกิจคุณควรทำเว็บแอปหรือแอปมือถือ',
    titleEn: 'Should your business build a web app or a mobile app?',
    excerptTh: 'คำถามที่ตอบผิดแล้วเสียเงินหลายแสน ลองใช้เกณฑ์ 5 ข้อนี้ตัดสินใจก่อนเริ่มโปรเจกต์',
    excerptEn: 'Getting this wrong is expensive. Five questions to answer before you commit to either.',
    tags: ['พัฒนาซอฟต์แวร์', 'กลยุทธ์'],
    readingMinutes: 7,
  },
]

const lorem = (titleTh: string) => `## ทำไมเรื่องนี้ถึงสำคัญ

${titleTh} เป็นคำถามที่เราได้ยินเกือบทุกสัปดาห์จากเจ้าของธุรกิจที่กำลังเปรียบเทียบใบเสนอราคาหลายเจ้า

บทความนี้เป็นเนื้อหาตัวอย่างสำหรับ seed ข้อมูล — เขียนทับได้ที่หน้า /admin

## หัวข้อย่อย

เนื้อหาส่วนนี้รองรับ Markdown ทั้งหมด ทั้งหัวข้อ รายการ ตัวหนา และลิงก์

- ประเด็นแรกที่ต้องพิจารณา
- ประเด็นที่สองซึ่งมักถูกมองข้าม
- ประเด็นที่สามเกี่ยวกับงบประมาณระยะยาว

## สรุป

ถ้ามีคำถามเพิ่มเติม ทักมาคุยกันได้ ไม่มีค่าใช้จ่ายในการปรึกษาครั้งแรก`

async function seedPosts(authorId: string | null) {
  for (const [index, p] of posts.entries()) {
    await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...p,
        bodyTh: lorem(p.titleTh),
        bodyEn: lorem(p.titleEn),
        coverImage: img(`post-${p.slug}`, 1600, 900),
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(Date.now() - index * 86_400_000 * 14),
        authorId,
      },
    })
  }
  console.log(`✓ บทความ ${posts.length} เรื่อง`)
}

const team = [
  { name: 'อเล็กซ์ ศรีอนันต์', roleTh: 'ผู้ก่อตั้ง / ผู้กำกับ', roleEn: 'Founder / Director', bioTh: 'ทำงานสายโปรดักชันมา 12 ปี เริ่มจากช่างภาพอิสระจนตั้งทีมของตัวเอง เชื่อว่างานที่ดีเริ่มจากการฟังลูกค้าให้จบก่อน', bioEn: 'Twelve years in production, from freelance photographer to running his own team. Believes good work starts with listening all the way through.' },
  { name: 'ณิชา ธนวัฒน์', roleTh: 'หัวหน้าทีมพัฒนา', roleEn: 'Lead Developer', bioTh: 'วิศวกรซอฟต์แวร์ที่ชอบงานยากและระบบที่ต้องทนผู้ใช้จำนวนมาก ดูแลงานเว็บและแอปทั้งหมดของทีม', bioEn: 'A software engineer drawn to hard problems and systems that must survive real traffic. Leads all web and app work.' },
  { name: 'กิตติพงศ์ เรืองแสง', roleTh: 'ช่างภาพ / ตากล้อง', roleEn: 'Photographer / Cinematographer', bioTh: 'ถนัดงานแสงยากและสถานที่ที่ควบคุมไม่ได้ เคยถ่ายงานตั้งแต่ในถ้ำจนถึงบนดาดฟ้าตึก 40 ชั้น', bioEn: 'Specialises in difficult light and uncontrollable locations, from caves to fortieth-floor rooftops.' },
]

async function seedTeam() {
  const count = await prisma.teamMember.count()
  if (count > 0) {
    console.log('• ข้ามทีมงาน — มีข้อมูลอยู่แล้ว')
    return
  }
  await prisma.teamMember.createMany({
    data: team.map((m, i) => ({ ...m, photo: img(`team-${i}`, 800, 800), order: i + 1 })),
  })
  console.log(`✓ ทีมงาน ${team.length} คน`)
}

const settings: Record<string, unknown> = {
  company: {
    nameTh: 'อเล็กซาน โปรดักชั่น',
    nameEn: 'Alexan Production',
    legalNameTh: 'บริษัท อเล็กซาน โปรดักชั่น จำกัด',
    taxId: '',
    addressTh: '35 หมู่ 9 ตำบลปากแพรก อำเภอปากพนัง จังหวัดนครศรีธรรมราช 80140',
    addressEn: '35 Moo 9, Pak Phraek, Pak Phanang, Nakhon Si Thammarat 80140, Thailand',
    email: 'akkalak213@gmail.com',
    phone: '+66 62 284 1997',
    lineId: '@073klrfz',
    openingHoursTh: 'เปิดทุกวัน 09.00 – 22.00 น.',
    openingHoursEn: 'Open daily, 09:00 – 22:00',
    mapUrl: '',
    latitude: 8.3517,
    longitude: 100.2003,
  },
  social: {
    facebook: '',
    instagram: '',
    youtube: '',
    tiktok: '',
    line: '',
  },
  hero: {
    eyebrowTh: 'รับทำเว็บ ถ่ายภาพ ถ่ายวิดีโอ',
    eyebrowEn: 'Websites, photography, film',
    headlineTh: 'งานเว็บกับงานภาพ จบที่ทีมเดียว',
    headlineEn: 'The web side and the visual side, one team',
    subheadlineTh:
      'ไม่ต้องหาช่างภาพเจ้าหนึ่ง คนทำเว็บอีกเจ้าหนึ่ง แล้วมานั่งประสานเอง เราทำให้ทั้งหมดและคุณคุยกับเราที่เดียว',
    subheadlineEn:
      'No hiring a photographer here and a developer there, then coordinating them yourself. We do both, and you talk to one team.',
  },
  quote: {
    defaultValidDays: 30,
    defaultVatRate: 7,
    defaultWithholdingRate: 3,
    termsTh: 'ราคานี้ยืนยันภายใน 30 วันนับจากวันที่ออกใบเสนอราคา\nชำระมัดจำ 50% ก่อนเริ่มงาน ส่วนที่เหลือชำระเมื่อส่งมอบงาน\nราคายังไม่รวมค่าเดินทางนอกเขตกรุงเทพฯ และปริมณฑล',
    termsEn: 'This quotation is valid for 30 days from the issue date.\n50% deposit is due before work begins; the balance is due on delivery.\nTravel outside Bangkok and surrounding provinces is not included.',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
  },
}

async function seedSettings() {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object },
    })
  }
  console.log(`✓ ค่าตั้งค่าเว็บ ${Object.keys(settings).length} กลุ่ม`)
}

async function main() {
  console.log('\n── Alexan Production · seed ──\n')
  const admin = await seedAdmin()
  await seedServices()
  await seedProjects(admin?.id ?? null)
  await seedEquipment()
  await seedReviews()
  await seedPosts(admin?.id ?? null)
  await seedTeam()
  await seedSettings()
  console.log('\nเสร็จเรียบร้อย\n')
}

main()
  .catch((e) => {
    console.error('seed ล้มเหลว:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
