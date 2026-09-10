/** Exact bundled seed content; public filtering never edits or deletes stored records. */
import type { Prisma } from '@/generated/prisma/client'

export const sampleProjects = [
  {
    "slug": "siriwat-group-corporate-site",
    "titleTh": "เว็บไซต์องค์กร ศิริวัฒน์ กรุ๊ป",
    "titleEn": "Siriwat Group Corporate Site",
    "summaryTh": "รื้อเว็บไซต์อายุ 9 ปีของกลุ่มธุรกิจก่อสร้าง ให้โหลดเร็วขึ้น 4 เท่าและทีมการตลาดแก้เนื้อหาเองได้",
    "summaryEn": "Rebuilt a nine-year-old construction group site to load four times faster, with content the marketing team owns."
  },
  {
    "slug": "thonglor-clinic-booking",
    "titleTh": "ระบบจองคิว คลินิกทองหล่อ",
    "titleEn": "Thonglor Clinic Booking System",
    "summaryTh": "ระบบนัดหมายและเวชระเบียนที่ลดเวลาลงทะเบียนหน้าเคาน์เตอร์จาก 12 นาทีเหลือ 3 นาที",
    "summaryEn": "An appointment and records system that cut front-desk check-in from twelve minutes to three."
  },
  {
    "slug": "baan-suan-delivery-app",
    "titleTh": "แอปสั่งอาหาร บ้านสวน",
    "titleEn": "Baan Suan Delivery App",
    "summaryTh": "แอปสั่งอาหารของร้านอาหารเครือ 8 สาขา ที่ตัดค่าคอมมิชชั่นแพลตฟอร์มออกไปทั้งหมด",
    "summaryEn": "An in-house ordering app for an eight-branch restaurant group that removed platform commissions entirely."
  },
  {
    "slug": "sarn-ceramics-product-shoot",
    "titleTh": "ถ่ายภาพสินค้า สารน์ เซรามิก",
    "titleEn": "Sarn Ceramics Product Shoot",
    "summaryTh": "ภาพสินค้า 120 ชิ้นสำหรับแคตตาล็อกและร้านค้าออนไลน์ ถ่ายเสร็จใน 3 วัน",
    "summaryEn": "A 120-piece catalogue and e-commerce shoot completed across three days."
  },
  {
    "slug": "chiangmai-coffee-brand-film",
    "titleTh": "หนังแบรนด์ กาแฟเชียงใหม่",
    "titleEn": "Chiang Mai Coffee Brand Film",
    "summaryTh": "สารคดีสั้น 3 นาที ตามรอยเมล็ดกาแฟจากไร่บนดอยถึงแก้วในเมือง",
    "summaryEn": "A three-minute short following the bean from a hillside farm to a cup in the city."
  },
  {
    "slug": "aurora-fashion-lookbook",
    "titleTh": "ลุคบุ๊ก Aurora Fashion",
    "titleEn": "Aurora Fashion Lookbook",
    "summaryTh": "ถ่ายลุคบุ๊กคอลเลกชันฤดูฝนในสตูดิโอ พร้อมคลิปสั้นสำหรับโซเชียล",
    "summaryEn": "A rainy-season collection lookbook shot in studio, with social cutdowns."
  },
  {
    "slug": "sme-expo-event-coverage",
    "titleTh": "บันทึกงาน SME Expo 2025",
    "titleEn": "SME Expo 2025 Coverage",
    "summaryTh": "ถ่ายทำงานสัมมนา 2 วัน ส่งไฮไลต์รายวันภายในเช้าวันถัดไป",
    "summaryEn": "Two days of conference coverage with daily highlight reels delivered by the next morning."
  },
  {
    "slug": "alexan-studio-space",
    "titleTh": "สตูดิโอ Alexan",
    "titleEn": "The Alexan Studio",
    "summaryTh": "พื้นที่ถ่ายทำ 120 ตารางเมตร เพดานสูง 4.5 เมตร พร้อมฉากโค้งขาวและชุดไฟครบ",
    "summaryEn": "A 120 sqm shoot space with 4.5 m ceilings, white cyclorama, and a full lighting kit."
  }
]

export const sampleReviews = [
  {
    "authorName": "ณัฐพงษ์ วิริยะกุล",
    "rating": 5,
    "content": "เว็บเดิมของเราโหลดช้ามากจนลูกค้าบ่น ทีม Alexan รื้อใหม่ทั้งหมดและอธิบายทุกขั้นตอนให้เราเข้าใจ ตอนนี้ทีมการตลาดแก้เนื้อหาเองได้โดยไม่ต้องรอใคร คุ้มค่ามาก"
  },
  {
    "authorName": "Sarah Whitmore",
    "rating": 5,
    "content": "They understood the collection before we even finished explaining it. The lookbook shots needed almost no revision, and the social cutdowns they threw in became our best performing posts of the season."
  },
  {
    "authorName": "ปิยะดา แสงทอง",
    "rating": 5,
    "content": "สินค้า 120 ชิ้นถ่ายเสร็จใน 3 วันตามที่สัญญาไว้ ภาพสวยกว่าที่คิดไว้เยอะ ยอดขายออนไลน์ขึ้นเห็นได้ชัดหลังเปลี่ยนรูป"
  },
  {
    "authorName": "ธนกฤต อารีย์วงศ์",
    "rating": 5,
    "content": "ก่อนหน้านี้ใช้กระดาษกับ Excel ปนกัน ทีมนี้มานั่งดูวิธีทำงานเราจริง ๆ ก่อนออกแบบระบบ ผลคือพนักงานใช้เป็นตั้งแต่วันแรก ไม่ต้องอบรมซ้ำ"
  },
  {
    "authorName": "James Attwood",
    "rating": 5,
    "content": "The brand film hit exactly the tone we wanted — warm, unhurried, honest. They handled a two-day mountain shoot in unpredictable weather without a single complaint."
  },
  {
    "authorName": "มณีรัตน์ ชัยพัฒน์",
    "rating": 4,
    "content": "สตูดิโอสะอาด ไฟครบ เจ้าหน้าที่ช่วยเหลือดีมาก ติดอย่างเดียวคือที่จอดรถเต็มบ่อยช่วงวันหยุด แนะนำให้มาเช้าหน่อย"
  },
  {
    "authorName": "สุรชัย พงศ์ภัทร",
    "rating": 5,
    "content": "แอปที่ทำให้เราหยุดจ่ายค่าคอมมิชชั่นให้แพลตฟอร์มเดลิเวอรี คืนทุนภายใน 7 เดือน ทีมงานตอบเร็วและแก้ปัญหาให้ตลอดแม้หลังส่งมอบไปแล้ว"
  }
]

export const publicProjectWhere = { status: 'PUBLISHED', NOT: sampleProjects } satisfies Prisma.ProjectWhereInput
export const publicReviewWhere = { status: 'APPROVED', NOT: sampleReviews } satisfies Prisma.ReviewWhereInput

export function isPlaceholderImage(url: string): boolean {
  try { return ['picsum.photos', 'fastly.picsum.photos', 'example.com'].includes(new URL(url).hostname) } catch { return false }
}
