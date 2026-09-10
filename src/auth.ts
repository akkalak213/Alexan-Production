import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { authConfig } from './auth.config'
import { db } from './lib/db'
import {
  checkLoginAllowed,
  emailHashOf,
  getClientIpHash,
  recordLoginAttempt,
} from './lib/rate-limit'

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const email = parsed.data.email.toLowerCase()
        const [emailHash, ipHash] = [emailHashOf(email), await getClientIpHash()]

        /**
         * ด่านนี้อยู่ใน authorize ไม่ใช่ในฟอร์ม เพราะฟอร์มไม่ใช่ทางเดียวที่เข้ามาถึงตรงนี้ได้
         * ใครก็ยิง POST เข้า /api/auth/callback/credentials ตรง ๆ ได้โดยไม่ผ่านหน้าเว็บ
         *
         * ครั้งที่ถูกบล็อกจะไม่ถูกบันทึกเป็นความล้มเหลว ไม่งั้นคนที่ยิงไม่หยุด
         * จะต่ออายุการบล็อกออกไปได้เรื่อย ๆ จนเจ้าของบัญชีตัวจริงเข้าระบบไม่ได้ถาวร
         */
        if ((await checkLoginAllowed(emailHash, ipHash)).blocked) return null

        const user = await db.user.findUnique({ where: { email } })

        /**
         * เทียบ hash เสมอแม้ไม่เจอผู้ใช้ เพื่อให้เวลาที่ใช้ตอบใกล้เคียงกันทุกกรณี
         * ถ้า return null ทันทีตอนไม่เจอ คนร้ายจะจับเวลาแล้วเดาได้ว่าอีเมลไหนมีอยู่จริง
         */
        const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin'
        const isValid = await bcrypt.compare(parsed.data.password, hash)
        const signedIn = Boolean(user?.isActive && isValid)

        await recordLoginAttempt({ emailHash, ipHash, success: signedIn })

        if (!user || !signedIn) return null

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
        }
      },
    }),
  ],
})
