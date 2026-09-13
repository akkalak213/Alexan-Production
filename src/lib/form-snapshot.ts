/**
 * ภาพรวมค่าทั้งหมดในฟอร์ม ใช้เทียบว่ามีอะไรถูกแก้ไปจากตอนเปิดหน้าหรือตอนบันทึกล่าสุดหรือยัง
 *
 * เทียบจากค่าที่จะถูกส่งจริง (FormData) ไม่ใช่นับว่ามีการพิมพ์ไหม
 * พิมพ์แล้วลบกลับเป็นค่าเดิมจึงไม่นับว่าแก้ ส่วนการสลับลำดับรูปหรือเอารูปออกนับว่าแก้
 */

/** ช่องที่ระบบเปลี่ยนเองหลังบันทึก ไม่ใช่สิ่งที่ผู้ใช้แก้ */
const IGNORED_FIELDS = new Set(['expectedVersion'])

export function serializeFormEntries(entries: Iterable<[string, FormDataEntryValue]>): string {
  const pairs: [string, string][] = []

  for (const [name, value] of entries) {
    // React เติมช่อง $ACTION_... ให้ฟอร์มที่ผูกกับ server action เอง
    if (IGNORED_FIELDS.has(name) || name.startsWith('$ACTION')) continue
    // เก็บเป็นคู่ ไม่ต่อด้วยเครื่องหมาย ช่อง a ที่มีค่า "b=c" จะได้ไม่เหมือนช่อง "a=b" ที่มีค่า c
    pairs.push([name, typeof value === 'string' ? value : `file:${value.name}:${value.size}`])
  }

  return JSON.stringify(pairs)
}
