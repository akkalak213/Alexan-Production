/**
 * แปลงข้อมูลธุรกิจที่พิมพ์เป็นข้อความอิสระในหน้าตั้งค่า ให้เป็นรูปแบบที่ schema.org รับ
 *
 * หน้าตั้งค่ามีช่องเดียวสำหรับที่อยู่ และอีกช่องเดียวสำหรับเวลาทำการ ซึ่งถูกแล้วสำหรับคนกรอก
 * แต่ schema.org ต้องการที่อยู่ที่แยกเป็นตำบล อำเภอ จังหวัด รหัสไปรษณีย์
 * และต้องการเวลาทำการในรูปแบบตายตัว (opens/closes เป็น 24 ชั่วโมง) ไม่ใช่ประโยคภาษาไทย
 *
 * ของเดิมยัดที่อยู่ทั้งบรรทัดลง streetAddress และส่งข้อความไทยไปเป็น openingHours ตรง ๆ
 * ค่าหลังผิดรูปแบบชัดเจน Google จะข้ามทิ้ง — และการค้นหาที่ระบุพื้นที่
 * ต้องอาศัยที่อยู่ที่แยกส่วนแล้ว ไม่ใช่ข้อความก้อนเดียว
 *
 * ทุกฟังก์ชันในไฟล์นี้ "ไม่เดา": แกะได้เท่าที่มั่นใจ ที่เหลือคืนค่าว่าง
 * ส่งข้อมูลไม่ครบยังดีกว่าส่งข้อมูลที่แต่งขึ้นมาเอง เพราะอย่างหลังทำให้ Google เลิกเชื่อทั้งก้อน
 */

export type ThaiAddressParts = {
  /** บ้านเลขที่ หมู่ ซอย ถนน — ส่วนที่อยู่ก่อนตำบล */
  streetAddress: string
  /** อำเภอ หรือ เขต */
  addressLocality: string
  /** จังหวัด (กรุงเทพมหานครนับเป็นจังหวัด) */
  addressRegion: string
  postalCode: string
}

const EMPTY_ADDRESS: ThaiAddressParts = {
  streetAddress: '',
  addressLocality: '',
  addressRegion: '',
  postalCode: '',
}

/** คำนำหน้าหน่วยการปกครองที่ใช้เป็นจุดตัด ทั้งแบบเต็มและแบบย่อ */
const MARKER = /(ตำบล|ต\.|แขวง|อำเภอ|อ\.|เขต|จังหวัด|จ\.)/g

/**
 * แกะที่อยู่ไทยออกเป็นส่วน ๆ
 *
 * รองรับรูปแบบที่คนไทยเขียนจริง ทั้งเต็ม (ตำบล/อำเภอ/จังหวัด) และย่อ (ต./อ./จ.)
 * รวมถึงกรุงเทพฯ ที่ใช้ แขวง/เขต และไม่มีคำว่า "จังหวัด" นำหน้าชื่อจังหวัด
 *
 * ที่อยู่ที่แกะไม่ออกจะได้ streetAddress เป็นข้อความเต็มเหมือนเดิม ส่วนที่เหลือว่าง
 * ซึ่งเท่ากับพฤติกรรมก่อนหน้านี้พอดี — ไม่มีทางแย่ลงกว่าเดิม
 */
export function parseThaiAddress(address: string | null | undefined): ThaiAddressParts {
  const text = address?.replace(/\s+/g, ' ').trim() ?? ''
  if (!text) return { ...EMPTY_ADDRESS }

  const postalCode = text.match(/\b(\d{5})\b/)?.[1] ?? ''

  /**
   * ถอดรหัสไปรษณีย์กับกรุงเทพฯ ออกจากข้อความก่อนแกะส่วนที่เหลือ
   *
   * กรุงเทพฯ ต้องถอดออกเพราะที่อยู่จริงเขียนว่า "เขตวัฒนา กรุงเทพมหานคร" โดยไม่มีคำว่า
   * "จังหวัด" คั่น ถ้าไม่ถอดออกก่อน ค่าของเขตจะกลืนชื่อจังหวัดเข้าไปด้วยเป็น "วัฒนา กรุงเทพมหานคร"
   */
  let rest = postalCode ? text.replace(postalCode, ' ') : text

  const bangkok = /กรุงเทพมหานคร|กรุงเทพฯ|กรุงเทพ/.exec(rest)
  if (bangkok) rest = rest.replace(bangkok[0], ' ')

  rest = rest.replace(/\s+/g, ' ').trim()

  /**
   * ตัดข้อความเป็นช่วง ๆ ตามคำนำหน้า แล้วเก็บว่าแต่ละคำนำหน้าตามด้วยอะไร
   * ข้อความก่อนคำนำหน้าตัวแรกคือบ้านเลขที่กับถนน
   */
  const markers = [...rest.matchAll(MARKER)]
  const head = (markers.length ? rest.slice(0, markers[0].index) : rest)
    .replace(/[,\s]+$/, '')
    .trim()

  const values = new Map<string, string>()
  markers.forEach((match, index) => {
    const start = (match.index ?? 0) + match[0].length
    const end = index + 1 < markers.length ? markers[index + 1].index : rest.length
    const value = rest.slice(start, end).replace(/^[,\s]+|[,\s]+$/g, '').trim()
    if (value) values.set(match[0], value)
  })

  const district = values.get('อำเภอ') ?? values.get('อ.') ?? values.get('เขต') ?? ''
  const subDistrict = values.get('ตำบล') ?? values.get('ต.') ?? values.get('แขวง') ?? ''
  const province = values.get('จังหวัด') ?? values.get('จ.') ?? (bangkok ? 'กรุงเทพมหานคร' : '')

  /**
   * schema.org มีช่องเดียวสำหรับ "เมือง" ซึ่งไม่ตรงกับระบบตำบล/อำเภอของไทยพอดี
   * เลือกอำเภอเป็น addressLocality เพราะเป็นหน่วยที่คนค้นหาใช้จริง ("รับทำเว็บ อำเภอเมือง")
   * ตำบลมีรายละเอียดเกินกว่าที่ใครจะพิมพ์หา จึงใช้เป็นตัวสำรองเมื่อไม่มีอำเภอเท่านั้น
   */
  return {
    streetAddress: head || text,
    addressLocality: district || subDistrict,
    addressRegion: province,
    postalCode,
  }
}

// ─────────────────── เวลาทำการ ───────────────────

export type OpeningHours = {
  dayOfWeek: string[]
  /** รูปแบบ 24 ชั่วโมง เช่น "09:00" */
  opens: string
  closes: string
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WEEKDAYS = ALL_DAYS.slice(0, 5)

/**
 * แกะเวลาทำการจากประโยคภาษาไทยหรืออังกฤษ
 *
 * รองรับเท่าที่เขียนกันจริง: "เปิดทุกวัน 09.00 – 22.00 น.", "จันทร์-ศุกร์ 9:00-18:00",
 * "Mon-Fri 09:00-18:00", "Everyday 10.00-20.00"
 *
 * ประโยคที่ซับซ้อนกว่านั้น (หลายช่วงเวลาในวันเดียว หรือแยกเวลาเสาร์อาทิตย์) จะคืน null
 * แล้วผู้เรียกจะไม่ประกาศเวลาทำการเลย — ดีกว่าประกาศเวลาที่ผิด
 * ลูกค้าที่มาตามเวลาที่ Google บอกแล้วเจอร้านปิด คือลูกค้าที่เสียไปเลย
 */
export function parseOpeningHours(value: string | null | undefined): OpeningHours | null {
  const text = value?.trim()
  if (!text) return null

  // ยอมรับทั้ง 09.00 และ 09:00 และเลขหลักเดียวอย่าง 9:00
  const times = [...text.matchAll(/(\d{1,2})[.:](\d{2})/g)].map(
    (match) => `${match[1].padStart(2, '0')}:${match[2]}`,
  )
  if (times.length < 2) return null

  const [opens, closes] = times
  // เวลาปิดก่อนเวลาเปิดคือค่าที่กรอกผิด ไม่ใช่ร้านที่เปิดข้ามคืน — ไม่เดาแทน
  if (opens >= closes) return null

  const everyday = /ทุกวัน|every ?day|daily|จันทร์\s*[-–]\s*อาทิตย์|จ\s*[-–]\s*อา/i.test(text)
  const weekdays = /จันทร์\s*[-–]\s*ศุกร์|จ\s*[-–]\s*ศ(?!\S)|mon\w*\s*[-–]\s*fri\w*/i.test(text)

  if (everyday) return { dayOfWeek: ALL_DAYS, opens, closes }
  if (weekdays) return { dayOfWeek: WEEKDAYS, opens, closes }

  // มีเวลาแต่ไม่บอกว่าวันไหน — ไม่เดาว่าเปิดทุกวัน
  return null
}
