import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { getAdminCounts } from '@/server/admin-queries'
import { getActiveUser } from '@/server/cms-helpers'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  /**
   * middleware กันไว้ชั้นหนึ่งแล้ว แต่เช็คซ้ำที่นี่ด้วย
   * เพราะ middleware อ่านแค่ cookie ส่วนชั้นนี้คือด่านจริงที่ประกอบหน้าขึ้นมา
   *
   * ใช้ getActiveUser ที่ไปอ่านฐานข้อมูล ไม่ใช่ auth() เปล่า ๆ
   * บัญชีที่ถูกปิดไปแล้วจะได้เปิดหน้าหลังบ้านไม่ได้ทันที ไม่ต้องรอ token หมดอายุอีก 8 ชั่วโมง
   * และชื่อกับสิทธิ์ที่แสดงบนแถบข้างคือค่าล่าสุดจริง ไม่ใช่ค่าที่ค้างอยู่ใน token ตั้งแต่ตอนล็อกอิน
   */
  const user = await getActiveUser()
  if (!user) redirect('/admin/login')

  const counts = await getAdminCounts()

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={counts}
    >
      {children}
    </AdminShell>
  )
}
