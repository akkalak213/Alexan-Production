/**
 * สเปกอุปกรณ์ที่เก็บเป็น JSON ในคอลัมน์ specs
 *
 * แต่ละแถวมีหัวข้อกับค่าภาษาไทย (label/value) และภาษาอังกฤษ (labelEn/valueEn) ถ้ากรอกไว้
 * ชื่อ label/value เป็นชื่อเดิมตั้งแต่ก่อนมีภาษาอังกฤษ ข้อมูลเก่าจึงอ่านได้ตามเดิมโดยไม่ต้องย้ายข้อมูล
 *
 * เดิมหน้าเว็บภาษาอังกฤษแสดงสเปกชุดภาษาไทยตรง ๆ เมนูกับราคาเป็นอังกฤษแล้ว
 * แต่การ์ดยังขึ้น "ช่วงเลนส์" "รูรับแสง" "เมาท์" ทำให้หน้าอังกฤษดูทำไม่เสร็จ
 */

export type SpecRow = { label: string; value: string; labelEn: string; valueEn: string }
export type Spec = { label: string; value: string }

/**
 * หัวข้อสเปกที่ใช้บ่อย แปลให้เองเมื่อแอดมินยังไม่ได้กรอกหัวข้อภาษาอังกฤษ
 * แปลเฉพาะหัวข้อ ไม่แปลค่า — ค่าเป็นตัวเลขกับหน่วยปนประโยค เดาแปลเองมีโอกาสผิดความหมาย
 */
const labelGlossary: Record<string, string> = {
  เซนเซอร์: 'Sensor',
  ความละเอียด: 'Resolution',
  วิดีโอ: 'Video',
  เมาท์: 'Mount',
  ช่วงเลนส์: 'Focal length',
  ทางยาวโฟกัส: 'Focal length',
  รูรับแสง: 'Aperture',
  กันสั่น: 'Stabilization',
  กำลังไฟ: 'Power',
  อุณหภูมิสี: 'Color temperature',
  แบตเตอรี่: 'Battery',
  จำนวนช่อง: 'Channels',
  ช่องรับ: 'Inputs',
  ระยะ: 'Range',
  บันทึกสำรอง: 'Backup recording',
  รับน้ำหนัก: 'Payload',
  รองรับน้ำหนัก: 'Payload',
  ความสูงสูงสุด: 'Max height',
  หัวบอล: 'Ball head',
  ความถูกต้องของสี: 'Color accuracy',
  ระยะเวลาในการใช้งาน: 'Runtime',
  ระบบล็อค: 'Axis locks',
  กล้อง: 'Camera',
  บินได้: 'Flight time',
  ความจุ: 'Capacity',
  ความเร็วเขียน: 'Write speed',
  น้ำหนัก: 'Weight',
}

/** หัวข้อภาษาอังกฤษที่ระบบจะใช้แทนเมื่อช่องภาษาอังกฤษว่าง — ไม่รู้จักคืน undefined */
export function glossaryLabel(label: string): string | undefined {
  return labelGlossary[label.trim()]
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** อ่าน JSON จากฐานข้อมูลเป็นแถวครบทั้งสองภาษา ใช้ในฟอร์มหลังบ้าน */
export function readSpecRows(value: unknown): SpecRow[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row) => ({
      label: asText(row.label),
      value: asText(row.value),
      labelEn: asText(row.labelEn),
      valueEn: asText(row.valueEn),
    }))
    .filter((row) => row.label && row.value)
}

/**
 * สเปกตามภาษาของหน้า
 * ภาษาอังกฤษ: ใช้ที่แอดมินกรอก → หัวข้อที่รู้จักแปลให้ → ภาษาไทยเดิม (ยังดีกว่าไม่แสดงเลย)
 */
export function localizeSpecs(value: unknown, locale: string): Spec[] {
  const rows = readSpecRows(value)
  if (locale !== 'en') return rows.map(({ label, value }) => ({ label, value }))

  return rows.map((row) => ({
    label: row.labelEn || glossaryLabel(row.label) || row.label,
    value: row.valueEn || row.value,
  }))
}

/**
 * แถวสเปกจากฟอร์มหลังบ้าน (ช่อง specsLabel, specsValue, specsLabelEn, specsValueEn เรียงตามแถว)
 *
 * ภาษาไทยเป็นภาษาหลักของเว็บ ถ้าแอดมินกรอกแต่ภาษาอังกฤษ ใช้ค่านั้นเป็นภาษาไทยด้วย แถวจะได้ไม่หายเงียบ ๆ
 * ช่องภาษาอังกฤษที่ว่างไม่เก็บ ข้อมูลจึงหน้าตาเหมือนเดิมสำหรับอุปกรณ์ที่ยังไม่ได้แปล
 */
export function specsFromForm(formData: FormData, name: string): Record<string, string>[] {
  const read = (field: string) => formData.getAll(`${name}${field}`).map((v) => String(v).trim())
  const labels = read('Label')
  const values = read('Value')
  const labelsEn = read('LabelEn')
  const valuesEn = read('ValueEn')

  return labels.flatMap((rawLabel, index) => {
    const labelEn = labelsEn[index] ?? ''
    const valueEn = valuesEn[index] ?? ''
    const label = rawLabel || labelEn
    const value = values[index] || valueEn
    if (!label || !value) return []

    return [
      {
        label,
        value,
        ...(labelEn ? { labelEn } : {}),
        ...(valueEn ? { valueEn } : {}),
      },
    ]
  })
}
