/**
 * รายการอุปกรณ์ที่ลูกค้าติ๊กไว้ เก็บข้ามการเปลี่ยนหน้า
 *
 * ทำไมต้องมี: การ์ดอุปกรณ์แต่ละใบเป็นลิงก์ไปหน้าของชิ้นนั้นแล้ว ลูกค้าจึงเข้า-ออกหน้ารายละเอียด
 * ได้เรื่อย ๆ ถ้าเก็บรายการไว้ใน state ของหน้าแคตตาล็อกอย่างเดียว ของที่เลือกไว้จะหายทุกครั้ง
 * ที่กดดูรายละเอียดสักชิ้น — ซึ่งเป็นเหตุผลเดิมที่รายละเอียดเคยทำเป็นกล่องซ้อนแทนหน้าแยก
 * รอบนี้แก้ที่ต้นเหตุ แล้วหน้ารายละเอียดจึงเป็นหน้าจริงได้โดยไม่เสียอะไร
 *
 * ใช้ sessionStorage ไม่ใช่ localStorage เพราะรายการที่เลือกเป็นของ "รอบการเลือกครั้งนี้"
 * ไม่ใช่ค่าที่ควรค้างข้ามวัน คนที่กลับมาพรุ่งนี้ควรเริ่มเลือกใหม่ ไม่ใช่เจอตะกร้าเก่าค้างอยู่
 *
 * ทำเป็น external store เพื่อให้ใช้กับ useSyncExternalStore ได้
 * ซึ่งเป็นวิธีที่ React เตรียมไว้สำหรับค่าที่อยู่นอก React และมี SSR — มันจะเรนเดอร์
 * ด้วยค่าฝั่งเซิร์ฟเวอร์ตอน hydrate แล้วค่อยสลับมาใช้ค่าจริงในเบราว์เซอร์ให้เอง
 * (การอ่าน sessionStorage ตอนตั้งค่าเริ่มต้นของ useState จะทำให้ HTML สองฝั่งไม่ตรงกัน
 *  ส่วนการ setState ใน useEffect ทำให้เรนเดอร์เพิ่มรอบหนึ่งทุกครั้งที่เปิดหน้า)
 */

const STORAGE_KEY = 'alexan:rental-selection'

/** อาเรย์ว่างตัวเดิมเสมอ — useSyncExternalStore เทียบด้วย Object.is ถ้าสร้างใหม่ทุกครั้งจะวนไม่จบ */
const EMPTY: string[] = []

const listeners = new Set<() => void>()

/**
 * ค่าจริงอยู่ในหน่วยความจำ ส่วน sessionStorage เป็นแค่สำเนาไว้ข้ามหน้า
 *
 * เรียงลำดับแบบนี้เพราะเบราว์เซอร์ในโหมดส่วนตัวโยน error ตั้งแต่ตอนเขียน
 * ถ้าให้ storage เป็นค่าจริง คนกลุ่มนั้นจะกดเลือกอุปกรณ์แล้วหน้าจอไม่ขยับเลย
 * แบบนี้เขายังใช้งานได้ครบ แค่เสียการจำข้ามหน้าไป
 *
 * null = ยังไม่เคยอ่านจาก storage ในรอบนี้
 */
let current: string[] | null = null

function readFromStorage(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!Array.isArray(parsed)) return EMPTY

    const ids = parsed.filter((id): id is string => typeof id === 'string')
    return ids.length ? ids : EMPTY
  } catch {
    return EMPTY
  }
}

export function subscribeToSelection(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getSelectionSnapshot(): string[] {
  current ??= readFromStorage()
  return current
}

/** ฝั่งเซิร์ฟเวอร์ยังไม่รู้ว่าเบราว์เซอร์เก็บอะไรไว้ — เริ่มจากยังไม่ได้เลือกอะไรเสมอ */
export function getSelectionServerSnapshot(): string[] {
  return EMPTY
}

export function setSelection(ids: string[]): void {
  current = ids.length ? ids : EMPTY

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // เก็บไม่ได้ก็ยังใช้งานต่อได้ในหน้านี้ แค่เสียการจำข้ามหน้าไป
  }

  for (const listener of listeners) listener()
}
