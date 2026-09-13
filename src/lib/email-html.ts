/**
 * ชิ้นส่วน HTML ของอีเมล
 *
 * แยกออกจาก mail.ts เพราะไฟล์นั้นอ่าน env และสร้างตัวส่งของ Resend ตั้งแต่ตอน import
 * เทมเพลตอีเมลจึงนำไปใช้และทดสอบได้โดยไม่ต้องมีค่า env ครบ
 *
 * ใช้ table กับ inline style ล้วน — โปรแกรมอ่านเมลส่วนใหญ่ยังตัด <style> ทิ้งและไม่รองรับ flex
 */

/** หนีอักขระ HTML ก่อนยัดข้อความจากผู้ใช้ลงในเทมเพลตอีเมล */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderRows(rows: [label: string, value: string | null | undefined][]): string {
  return rows
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 16px 8px 0;color:#6b675c;font-size:13px;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#16150f;font-size:14px">${escapeHtml(String(value)).replace(/\n/g, '<br>')}</td>
        </tr>`,
    )
    .join('')
}

export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fbfaf8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px">
      <p style="margin:0 0 24px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#c2632a">Alexan Production</p>
      <h1 style="margin:0 0 20px;font-size:20px;color:#16150f">${escapeHtml(title)}</h1>
      <table style="width:100%;border-collapse:collapse">${bodyHtml}</table>
    </div>
  </body></html>`
}
