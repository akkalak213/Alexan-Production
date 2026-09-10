'use client'

import { useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { useActionToast } from '@/components/ui/Toast'
import { Field, FormMessage, Input } from '@/components/ui/Form'
import { initialAdminState } from '@/server/admin-state'
import { authenticate } from '@/server/auth-actions'

export function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/admin'
  const [state, formAction, isPending] = useActionState(authenticate, initialAdminState)

  useActionToast(state)

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <Field htmlFor="email" label="อีเมล" required>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          placeholder="admin@alexan.studio"
        />
      </Field>

      <Field htmlFor="password" label="รหัสผ่าน" required>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </Field>

      {state.status === 'error' && state.message && (
        <FormMessage status="error">{state.message}</FormMessage>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? 'กำลังเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}
      </Button>
    </form>
  )
}
