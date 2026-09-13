'use client'

import { createContext, useContext } from 'react'

/**
 * สถานะกำลังบันทึกของ AdminForm
 *
 * AdminForm ส่งข้อมูลเองแทนการผูก action กับ <form> ตรง ๆ (ดูเหตุผลใน AdminForm.tsx)
 * useFormStatus จึงไม่รู้ว่ากำลังส่ง ปุ่มบันทึกอ่านจากตรงนี้แทน
 */
const AdminFormPendingContext = createContext(false)

export const AdminFormPendingProvider = AdminFormPendingContext.Provider

export function useAdminFormPending(): boolean {
  return useContext(AdminFormPendingContext)
}

/** ขอให้ส่วนที่ซ่อนช่องนี้อยู่ (แท็บภาษา) เปิดให้เห็นก่อนเลื่อนไปหา */
export const REVEAL_EVENT = 'admin-form:reveal'

/** บอกช่องที่ทำให้บันทึกไม่ผ่าน detail คือข้อความที่จะแสดง */
export const INVALID_EVENT = 'admin-form:invalid'
