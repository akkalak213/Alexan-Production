'use server'

import { AuthError } from 'next-auth'
import { signIn, signOut } from '@/auth'
import { checkLoginAllowed, emailHashOf, getClientIpHash } from '@/lib/rate-limit'
import type { AdminActionState } from './admin-state'

export async function authenticate(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const next = String(formData.get('next') ?? '/admin')
  /**
   * กัน open redirect — รับเฉพาะ path ภายในหลังบ้านเท่านั้น
   *
   * ต้องตัดค่าที่ขึ้นต้นด้วย '//' และ '/\' ออกด้วย ไม่ใช่แค่ดูว่าขึ้นต้นด้วย '/admin'
   * เพราะ `//evil.com` ก็เป็น path ที่ขึ้นต้นด้วย '/' เหมือนกัน แต่เบราว์เซอร์อ่านว่าเป็นโดเมนอื่น
   * (ตรงนี้ยังไม่หลุดเพราะบังคับ '/admin' อยู่แล้ว แต่กันไว้เผื่อเงื่อนไขถูกแก้ทีหลัง)
   */
  const isInternal = /^\/admin(?:[/?#]|$)/.test(next) && !next.startsWith('//')
  const redirectTo = isInternal ? next : '/admin'

  const email = String(formData.get('email') ?? '').toLowerCase()

  /**
   * ตรวจเพดานซ้ำที่นี่เพื่อบอกเหตุผลจริงให้คนที่กรอกฟอร์ม
   * ด่านที่บังคับใช้จริงอยู่ใน authorize ของ src/auth.ts ซึ่งครอบทุกทางเข้า ไม่ใช่แค่ฟอร์มนี้
   */
  const gate = await checkLoginAllowed(emailHashOf(email), await getClientIpHash())
  if (gate.blocked) {
    return {
      status: 'error',
      message: `ลองเข้าสู่ระบบผิดหลายครั้งเกินไป รออีก ${gate.retryAfterMinutes} นาทีแล้วลองใหม่`,
    }
  }

  try {
    await signIn('credentials', {
      email,
      password: String(formData.get('password') ?? ''),
      redirectTo,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      // ไม่บอกว่าอีเมลผิดหรือรหัสผ่านผิด เพื่อไม่ให้เดาได้ว่าอีเมลไหนมีอยู่ในระบบ
      return { status: 'error', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
    }
    // signIn โยน NEXT_REDIRECT เมื่อสำเร็จ ต้องปล่อยผ่านไปให้ Next จัดการ
    throw error
  }

  return { status: 'success' }
}

export async function logout() {
  await signOut({ redirectTo: '/admin/login' })
}
