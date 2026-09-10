'use client'

import { useActionState } from 'react'
import { AdminCard } from '@/components/admin/AdminPage'
import { useActionToast } from '@/components/ui/Toast'
import { SubmitButton } from '@/components/admin/AdminUI'
import { Field, FormMessage, Input, Textarea } from '@/components/ui/Form'
import { initialAdminState } from '@/server/admin-state'
import { saveSettings } from '@/server/cms-actions'

type Group = Record<string, unknown> | undefined

export function SettingsForm({
  company,
  social,
  hero,
  quote,
}: {
  company: Group
  social: Group
  hero: Group
  quote: Group
}) {
  const [state, formAction] = useActionState(saveSettings, initialAdminState)

  useActionToast(state)
  const value = (group: Group, key: string) => String(group?.[key] ?? '')

  return (
    <form action={formAction} className="space-y-6">
      <AdminCard
        title="ข้อมูลบริษัท"
        description="ใช้ทั้งใน footer หน้าติดต่อ และหัวใบเสนอราคา"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor="company_nameTh" label="ชื่อที่แสดง (ไทย)">
            <Input id="company_nameTh" name="company_nameTh" defaultValue={value(company, 'nameTh')} />
          </Field>
          <Field htmlFor="company_nameEn" label="Display name (EN)">
            <Input id="company_nameEn" name="company_nameEn" defaultValue={value(company, 'nameEn')} />
          </Field>
          <Field htmlFor="company_legalNameTh" label="ชื่อนิติบุคคล" hint="ใช้ในใบเสนอราคา">
            <Input
              id="company_legalNameTh"
              name="company_legalNameTh"
              defaultValue={value(company, 'legalNameTh')}
            />
          </Field>
          <Field htmlFor="company_taxId" label="เลขประจำตัวผู้เสียภาษี">
            <Input id="company_taxId" name="company_taxId" defaultValue={value(company, 'taxId')} />
          </Field>
          <Field htmlFor="company_email" label="อีเมล">
            <Input id="company_email" name="company_email" type="email" defaultValue={value(company, 'email')} />
          </Field>
          <Field htmlFor="company_phone" label="เบอร์โทร">
            <Input id="company_phone" name="company_phone" defaultValue={value(company, 'phone')} />
          </Field>
          <Field htmlFor="company_lineId" label="LINE ID">
            <Input id="company_lineId" name="company_lineId" defaultValue={value(company, 'lineId')} />
          </Field>
          <Field htmlFor="company_mapUrl" label="ลิงก์แผนที่">
            <Input id="company_mapUrl" name="company_mapUrl" defaultValue={value(company, 'mapUrl')} />
          </Field>
          <Field htmlFor="company_addressTh" label="ที่อยู่ (ไทย)">
            <Textarea
              id="company_addressTh"
              name="company_addressTh"
              defaultValue={value(company, 'addressTh')}
              className="min-h-20"
            />
          </Field>
          <Field htmlFor="company_addressEn" label="Address (EN)">
            <Textarea
              id="company_addressEn"
              name="company_addressEn"
              defaultValue={value(company, 'addressEn')}
              className="min-h-20"
            />
          </Field>
          <Field htmlFor="company_openingHoursTh" label="เวลาทำการ (ไทย)">
            <Input
              id="company_openingHoursTh"
              name="company_openingHoursTh"
              defaultValue={value(company, 'openingHoursTh')}
            />
          </Field>
          <Field htmlFor="company_openingHoursEn" label="Opening hours (EN)">
            <Input
              id="company_openingHoursEn"
              name="company_openingHoursEn"
              defaultValue={value(company, 'openingHoursEn')}
            />
          </Field>
          <Field htmlFor="company_latitude" label="ละติจูด">
            <Input id="company_latitude" name="company_latitude" defaultValue={value(company, 'latitude')} />
          </Field>
          <Field htmlFor="company_longitude" label="ลองจิจูด">
            <Input id="company_longitude" name="company_longitude" defaultValue={value(company, 'longitude')} />
          </Field>
        </div>
      </AdminCard>

      <AdminCard title="โซเชียล" description="เว้นว่าง = ไม่แสดงไอคอนนั้นใน footer">
        <div className="grid gap-5 sm:grid-cols-2">
          {['facebook', 'instagram', 'youtube', 'tiktok', 'line'].map((key) => (
            <Field key={key} htmlFor={`social_${key}`} label={key}>
              <Input
                id={`social_${key}`}
                name={`social_${key}`}
                defaultValue={value(social, key)}
                placeholder="https://"
              />
            </Field>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="ข้อความหน้าแรก" description="ส่วนหัวใหญ่สุดที่ลูกค้าเห็นก่อนอย่างอื่น">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor="hero_eyebrowTh" label="บรรทัดบน (ไทย)">
            <Input id="hero_eyebrowTh" name="hero_eyebrowTh" defaultValue={value(hero, 'eyebrowTh')} />
          </Field>
          <Field htmlFor="hero_eyebrowEn" label="Eyebrow (EN)">
            <Input id="hero_eyebrowEn" name="hero_eyebrowEn" defaultValue={value(hero, 'eyebrowEn')} />
          </Field>
          <Field htmlFor="hero_headlineTh" label="พาดหัว (ไทย)">
            <Textarea
              id="hero_headlineTh"
              name="hero_headlineTh"
              defaultValue={value(hero, 'headlineTh')}
              className="min-h-20"
            />
          </Field>
          <Field htmlFor="hero_headlineEn" label="Headline (EN)">
            <Textarea
              id="hero_headlineEn"
              name="hero_headlineEn"
              defaultValue={value(hero, 'headlineEn')}
              className="min-h-20"
            />
          </Field>
          <Field htmlFor="hero_subheadlineTh" label="คำอธิบายใต้พาดหัว (ไทย)">
            <Textarea
              id="hero_subheadlineTh"
              name="hero_subheadlineTh"
              defaultValue={value(hero, 'subheadlineTh')}
              className="min-h-24"
            />
          </Field>
          <Field htmlFor="hero_subheadlineEn" label="Subheadline (EN)">
            <Textarea
              id="hero_subheadlineEn"
              name="hero_subheadlineEn"
              defaultValue={value(hero, 'subheadlineEn')}
              className="min-h-24"
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard title="ค่าตั้งต้นใบเสนอราคา" description="ใช้เติมให้อัตโนมัติทุกครั้งที่สร้างใบใหม่">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field htmlFor="quote_defaultValidDays" label="ยืนราคากี่วัน">
            <Input
              id="quote_defaultValidDays"
              name="quote_defaultValidDays"
              type="number"
              defaultValue={value(quote, 'defaultValidDays') || '30'}
            />
          </Field>
          <Field htmlFor="quote_defaultVatRate" label="VAT (%)">
            <Input
              id="quote_defaultVatRate"
              name="quote_defaultVatRate"
              inputMode="decimal"
              defaultValue={value(quote, 'defaultVatRate') || '7'}
            />
          </Field>
          <Field htmlFor="quote_defaultWithholdingRate" label="หัก ณ ที่จ่าย (%)">
            <Input
              id="quote_defaultWithholdingRate"
              name="quote_defaultWithholdingRate"
              inputMode="decimal"
              defaultValue={value(quote, 'defaultWithholdingRate') || '3'}
            />
          </Field>
          <Field htmlFor="quote_bankName" label="ธนาคาร">
            <Input id="quote_bankName" name="quote_bankName" defaultValue={value(quote, 'bankName')} />
          </Field>
          <Field htmlFor="quote_bankAccountName" label="ชื่อบัญชี">
            <Input
              id="quote_bankAccountName"
              name="quote_bankAccountName"
              defaultValue={value(quote, 'bankAccountName')}
            />
          </Field>
          <Field htmlFor="quote_bankAccountNumber" label="เลขที่บัญชี">
            <Input
              id="quote_bankAccountNumber"
              name="quote_bankAccountNumber"
              defaultValue={value(quote, 'bankAccountNumber')}
            />
          </Field>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field htmlFor="quote_termsTh" label="เงื่อนไข (ไทย)" hint="ขึ้นบรรทัดใหม่ = ข้อใหม่">
            <Textarea
              id="quote_termsTh"
              name="quote_termsTh"
              defaultValue={value(quote, 'termsTh')}
              className="min-h-32 text-xs"
            />
          </Field>
          <Field htmlFor="quote_termsEn" label="Terms (EN)">
            <Textarea
              id="quote_termsEn"
              name="quote_termsEn"
              defaultValue={value(quote, 'termsEn')}
              className="min-h-32 text-xs"
            />
          </Field>
        </div>
      </AdminCard>

      {state.message && (
        <FormMessage status={state.status === 'error' ? 'error' : 'success'}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton size="lg">บันทึกทั้งหมด</SubmitButton>
    </form>
  )
}
