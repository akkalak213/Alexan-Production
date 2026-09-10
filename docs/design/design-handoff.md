# Developer Handoff — Alexan Production

วันที่: 10 กันยายน 2026 · สถานะ: D01, D03–D08 ดำเนินการแล้ว ดูบันทึกผลตรวจในหัวข้อ 10 ท้ายเอกสาร; D02 รอเจ้าของยืนยันเนื้อหา

ใช้คู่กับ [Design Critique](./design-critique.md) เพื่อดูหลักฐานและระดับความสำคัญ สเปก “เป้าหมาย” ด้านล่างเป็นข้อเสนอออกแบบ ส่วน “ปัจจุบัน” มาจากโค้ดและหน้าเว็บที่ตรวจ อย่าตีความว่าข้อเสนอผ่านการทดสอบแล้ว

## เป้าหมายและขอบเขต

ให้ลูกค้าเข้าใจว่า Alexan Production ทำอะไร เห็นผลงานจริง และส่งคำขอปรึกษาได้สะดวก บริการ เว็บไซต์ ผลงาน เช่าอุปกรณ์ รีวิว บทความ และเกี่ยวกับเรายังคงอยู่ ใช้ Next.js/React, Tailwind และ components เดิม ไม่เพิ่ม dependency หรือสร้างระบบออกแบบใหม่ทั้งชุด

ชื่อแบรนด์: **Alexan Production** ทุกภาษา · โดเมน canonical: **https://alexan.studio** · ไทย `/` · อังกฤษ `/en` · หลังบ้าน `/admin` ไม่มี prefix ภาษา

## 1. แก้เส้นทางก่อน (D01)

ไฟล์: `src/proxy.ts` ที่ `config.matcher`

String literal ต้องรักษา backslash ให้ regular expression มองเห็นจุดตามตัวอักษร โค้ดเป้าหมาย:

```ts
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

ตรวจ matcher ของ Next และ proxy ที่ใช้งานจริง อย่าทดสอบเพียง createMiddleware(routing) แยกจากตัวครอบ auth

เกณฑ์รับงาน:

- `/`, `/contact`, `/services`, `/en`, `/en/contact` เปิดได้ตาม locale จากการพิมพ์ URL และคลิกลิงก์ในหน้า
- คลิก “ขอใบเสนอราคา” ต้องพบ heading ของหน้าติดต่อและฟอร์ม ไม่ใช่แค่ HTTP 200 ที่ห่อหน้า error
- `/th/contact?package=...` ย้ายไป `/contact?package=...` โดยเก็บ query
- `/admin` เมื่อยังไม่ล็อกอินไป `/admin/login`; server actions ยังตรวจสิทธิ์แยกเหมือนเดิม
- `/api/health`, `/_next/*`, favicon และไฟล์สาธารณะไม่ผ่าน locale routing
- `/services/web` และผลงานที่เผยแพร่จริงต้องแสดงรายละเอียด; slug ที่ไม่มีคืน 404 แบบแบรนด์

## 2. Layout และ responsive

ใช้ `container` เดิม: padding-x 20px default, 24px ที่ sm, 32px ที่ lg และ max-width 1360px ที่ 2xl ไม่เปลี่ยน scale ส่วนอื่นของ Tailwind โดยไม่จำเป็น

| ช่วงจอ | โครงหน้าเป้าหมาย | Header / CTA |
| --- | --- | --- |
| 320–639px | คอลัมน์เดียว ข้อความ→CTA→ผลงานเด่น→บริการลัด/สถิติ; gap-8 | Header h-16; ชื่อเต็ม; theme/menu 44px; ภาษาในเมนู; CTA hero เต็มความกว้าง |
| 640–767px | คอลัมน์เดียว; ปุ่ม hero เรียงแนวนอนเมื่อข้อความพอดี; services 2 คอลัมน์ | ภาษาแสดงใน header เมื่อพอดี มิฉะนั้นอยู่ในเมนู |
| 768–1023px | services 2 คอลัมน์; contact ยัง 1 คอลัมน์ | Header h-20; collapsed navigation |
| 1024–1279px | Hero 2 คอลัมน์ 1.15fr/1fr; services 3; contact 1.4fr/1fr | เป้าหมายให้ยังใช้ collapsed navigation ถ้าชื่อแบรนด์+เมนู+controls ไม่พอ ห้ามลดตัวอักษรเพื่อยัด |
| ≥1280px | Hero 2 คอลัมน์ gap-16; content อยู่ใน container | full navigation; ภาษา/theme/CTA ทางขวา |

การเปลี่ยนจุดเปิด full navigation จาก lg เป็น xl เป็นข้อเสนอใหม่ ต้องเปลี่ยน visibility และ matchMedia close-on-desktop ให้ใช้ breakpoint เดียวกัน ทดสอบรอยต่อ 1023/1024 และ 1279/1280

Hero padding-y เป้าหมาย: py-10 มือถือ, md:py-16, lg:py-20 ภาพใช้ 4:3 บนมือถือและ 4:5 บน desktop ห้าม crop ภาพ screenshot งานเว็บจนสาระหลักหาย: ตั้ง focal point หรือเลือกภาพ cover ที่เหมาะกับสัดส่วนนี้

ลำดับ DOM ต้องสอดคล้องกับการอ่านและ tab order อย่าใช้ CSS order สลับลิงก์ไกลจากตำแหน่งโฟกัส กลุ่ม chips และสถิติอยู่หลัง hero หลักเพื่อให้ภาพมาก่อนบนมือถือ

เป้ารับงานที่ 390×844: CTA แรกเห็นครบในจอแรก และภาพผลงานเริ่มภายในประมาณ y=760 สำหรับข้อความแนะนำปัจจุบัน ค่านี้เป็นเป้าดีไซน์ ไม่ใช่การจำกัดความสูงแบบตายตัว เมื่อข้อความขยาย 200% ให้ยอมเลื่อนลงแทนการตัดข้อความ

## 3. Tokens

ค่าทั้งหมดอ้าง token/utilities ที่กำหนดไว้ ห้ามกระจาย magic values ไปหลาย component

| Token | ปัจจุบัน | เป้าหมาย / การใช้ |
| --- | --- | --- |
| `--background` | Light 40 23% 98%; Dark 240 8% 5% | คงเดิม |
| `--foreground` | Light 48 19% 7%; Dark 43 27% 95% | คงเดิม |
| `--accent` | Light 22 64% 46%; Dark 28 82% 67% | เริ่มทดลอง Light 22 64% 40%; Dark คงเดิม ตรวจคู่สีจริง ≥4.5:1 ก่อนรับ |
| `--accent-foreground` | Light ขาว; Dark 240 10% 6% | ใช้บน CTA accent; ตรวจ hover ที่มี opacity แยกจาก default |
| `--muted-foreground` | Light 43 8% 39%; Dark 40 8% 64% | คงสีพื้นฐาน งดลด opacity สำหรับข้อความจำเป็น |
| `--input` | Light 40 18% 86%; Dark 240 6% 20% | ปรับให้ขอบ/พื้น control แยกได้ชัด โดยคำนวณในบริบทพื้นจริง เป้า 3:1 สำหรับ visual boundary ที่จำเป็น |
| `--radius` | 0.75rem | rounded-lg 12px, rounded-md 8px, rounded-full เฉพาะ chips |
| `--font-thai` | IBM Plex Sans Thai 400/500/600/700 | body 400, label 500, heading 600 |
| `--font-sans` / `--font-display` | Inter / Instrument Serif | คงสำหรับอังกฤษ และคง serif ใน wordmark |
| `--hero-title-size` (ใหม่) | เดิมใช้ text-display-xl ร่วมทั้งเว็บ | มือถือ clamp(2.25rem, 7vw + .5rem, 2.75rem); md 3.25rem; lg 4.5rem |
| `--hero-title-leading` (ใหม่) | ไทย 1.5 จาก global heading rule | ไทย 1.35; อังกฤษ 1.1 ต้องตรวจสระและฟอนต์จริง |
| `text-base`, `text-sm`, `text-xs` | 16 / 14 / 12px | body+input 16; label 14; metadata รอง 12 |
| `h-11`, `h-12` | 44 / 48px | touch target / primary CTA ใช้ min-height เพื่อรองรับข้อความหลายบรรทัด |
| `gap-2`, `gap-3`, `gap-4`, `gap-8` | 8 / 12 / 16 / 32px | icons, CTA stack, form fields, กลุ่มเนื้อหา |
| `--ease-out` / Tailwind ease-out | cubic-bezier(0.16,1,0.3,1) ใน theme | ใช้ motion สั้นที่ระบุด้านล่าง |

ขนาด hero ใหม่ต้องจำกัดที่ component hero เท่านั้น อย่าแก้ `:lang(th) h1,h2,h3` ทุกหน้าพร้อมกัน

## 4. Component contracts

| Component | Props / API ที่ใช้ | สเปก |
| --- | --- | --- |
| Wordmark | `className?` | ชื่อเต็ม Alexan Production และโลโก้; ไม่ตัดคำบนจอเล็ก; ชื่อ accessible ของลิงก์ต้องอธิบายการกลับหน้าแรก |
| SiteHeader | local open state, localized pathname | active link ใช้ aria-current; menu toggle aria-expanded/controls; header height คงที่ |
| Hero (แยก component ได้ถ้าคุ้ม) | เสนอ `locale`, `hero`, `heroProject` | อ่านเนื้อหาจาก CMS; CTA 2 รายการ; ไม่มีภาพให้ลดเหลือข้อความและปุ่ม ไม่ใส่ placeholder อ้างว่าเป็นงานจริง |
| Button / buttonClasses | `variant`, `size`, native props | accent=ขอใบเสนอราคา, outline=ดูผลงาน, ghost=utility; loading ยังมี accessible name |
| Section | `id`, `eyebrow`, `title`, `subtitle`, `action`, `tone`, `align` | รักษา heading hierarchy และ anchor offset ไม่ให้ sticky header บัง |
| ProjectCard | `project`, `locale`, `featured?`, `priority?` | ชื่อโครงการไม่ตัด; summary อ่านได้; image decor alt ว่างได้เมื่อข้อความลิงก์บอกงานครบ; gallery ที่ภาพมีสาระต้องมี alt เฉพาะภาพ |
| LeadForm | `source`, `defaultService`, `equipmentIds`, `equipmentLabels`, `showServicePicker`, `initialPackage` | เก็บ package/service context; submit server action เดิม ไม่ส่งซ้ำเมื่อ pending |
| Field | `htmlFor`, `label`, `hint?`, `error?`, `required?`, `optionalLabel?` | เผย hint/error IDs ให้ control ผ่าน aria-describedby; ไม่ให้ id ซ้ำเมื่อมีหลายฟอร์ม |
| Input / Select / Textarea | native control props | text-base, min-h-11, error border+ข้อความ; Select มี chevron aria-hidden ที่ไม่บัง click |

## 5. States, keyboard และ feedback

| องค์ประกอบ | สถานะ | พฤติกรรมเป้าหมาย |
| --- | --- | --- |
| CTA/link | default / hover / focus / active | สีตาม variant; hover 160–200ms; focus ring 2px offset 2px; active scale .98 เฉพาะเมื่ออนุญาต motion |
| Mobile navigation | open | เสนอใช้ native dialog หรือ modal primitive ที่มีอยู่; aria-modal และชื่อ nav; focus ไปปุ่มปิด; background inert; body scroll locked |
| Mobile navigation | Tab / Shift+Tab | วนอยู่ภายใน modal; ปุ่มปิดอยู่ในวงโฟกัส; เมนูธรรมดาใช้ nav/link ไม่ใช้ role=menu |
| Mobile navigation | Escape / close | ปิดแล้วคืน focus ให้ปุ่มเปิด; คืน overflow ก่อนเปิด |
| Mobile navigation | navigate / resize | ปิดเมื่อเลือกลิงก์; เมื่อกลายเป็น desktop ต้องปลด inert/scroll lock และจัด focus ให้ element ที่มองเห็น |
| ภาษา | pending | disable เฉพาะตัวสลับ ป้องกันกดซ้ำ; เก็บ path/query ที่จำเป็น; ประกาศกำลังเปลี่ยนภาษา; มีทางคืนสถานะเมื่อผิดพลาด |
| Theme | light / dark | เปลี่ยนสีโดยไม่เปลี่ยนโครง; accessible label ระบุ action; คง preference เดิม |
| Form | idle | label ชัดเจน; required ใช้ native required ร่วมกับคำอธิบาย; optional แสดงข้อความ |
| Form | invalid | คงค่าที่กรอกและตัวเลือก; เชื่อม `${id}-error`; aria-invalid; focus ไป error summary หรือช่องผิดตัวแรกหลัง submit |
| Form | pending | aria-busy บน form; ปุ่ม “กำลังส่ง…” disabled; ประกาศ status; ไม่ซ่อนเนื้อหาที่กรอก |
| Form | network/server/rate-limit error | ข้อความไทย/อังกฤษที่ทำอะไรต่อได้; คงข้อมูล; เปิดให้ลองใหม่ตามสถานะ; ไม่แสดง raw stack |
| Form | success | ย้าย focus ไปหัวข้อผลลัพธ์ที่ tabindex=-1 หรือใช้ live region ที่ทำงานจริง; แสดง refCode; ไม่ส่งคำขอซ้ำเมื่อ reload |
| Query section | loading | reserve aspect ratio; skeleton เท่าขนาดโดยประมาณ; ไม่มี animated shimmer เมื่อ reduce motion |
| Query section | empty / unavailable | แยก “ยังไม่มีข้อมูล” กับ “โหลดไม่สำเร็จ”; เสนอ result union ใน query layer เพราะ safe() เดิมคืน [] ทั้งสองกรณี |
| Page | error / not found | error มี retry; 404 มีทางกลับหน้าแรก/บริการ; ไม่อ้างว่า slug ไม่มีเมื่อสาเหตุคือฐานข้อมูลล่ม |

ไม่จำเป็นต้องมี swipe, pinch หรือ long-press สำหรับหน้าแรก เมนู และ contact; native scroll ทำงานตามเบราว์เซอร์

## 6. เนื้อหาและขอบเขต

ข้อความ hero เสนอสำหรับทีมคอนเทนต์: “เว็บไซต์และงานภาพ ที่เล่าเรื่องธุรกิจคุณ” / “Websites and visuals for your business.” เป็นข้อความเสนอ ไม่ใช่ค่าที่เขียนลง CMS แล้ว

แนวทางความยาวเชิงบรรณาธิการ: eyebrow ประมาณ ≤40 ตัวอักษร, headline ไทย ≤55/อังกฤษ ≤70, subtitle ≤160 ต่อภาษา หลีกเลี่ยงบังคับ maxLength กับข้อความเดิมโดยไม่ migrate; เมื่อยาวให้ wrap ไม่ ellipsis หรือซ่อนสาระ ชื่อบริการต้องครบ; คำอังกฤษยาว/URL ใช้ overflow-wrap:anywhere ในพื้นที่จำเป็น

ข้อมูล hero จริงมาจาก SiteSetting; แก้เฉพาะ defaults ใน src/lib/settings.ts จะไม่เปลี่ยนค่าที่เคยบันทึกไว้ ต้องทำ content update ที่ตรวจทานได้หลังยืนยันข้อความ

ข้อจำกัด form จาก server schema ที่ต้องคงหรือประสานก่อนเปลี่ยน:

- name 2–100 ตัวอักษร, email ≤160
- company optional ≤120; phone optional รองรับรูปแบบไทยตาม schema ปัจจุบัน
- services 0–6 หมวด, budget optional (รวม “ยังไม่แน่ใจ”)
- message 10–3000; แสดง hint ก่อนส่ง และ counter แบบไม่ประกาศทุก keystroke
- equipmentIds ≤30; packageId ≤40; ชื่อ/ราคาของ package อ่านยืนยันฝั่ง server
- กฎ validation ฝั่ง client ต้องสอดคล้อง server รวมการ trim และข้อความสองภาษา

ข้อมูลตัวอย่าง: ให้เจ้าของยืนยันรายการที่เป็นงานจริงก่อนแสดง claim “ส่งมอบแล้ว” หรือ “ลูกค้าจริง” รีวิวและยอดรวมต้องนับเฉพาะข้อมูลที่ยืนยัน แสดงสถิติประสบการณ์จากข้อมูลที่ตรวจแล้ว; หากไม่ทราบให้ซ่อน ไม่ใช้ 0 หรือเลข 12 แทน

LINE: ใช้ social.line ที่ตรวจแล้วเท่านั้น ถ้ามีเพียง ID ให้แสดงเป็นข้อความที่คัดลอกได้และระบุว่าเป็น ID ไม่ทำเป็นลิงก์ปลอม

## 7. Motion

| ส่วน | ปัจจุบัน | เป้าหมาย |
| --- | --- | --- |
| Hero stage | rise-in 700ms, delay สูงสุด 440ms | fade/translate 8px, 350ms, stagger 60ms; delay รวมไม่เกิน 180ms |
| Hero headline | sweep 950ms | ยกเลิก clip sweep ซ้อนกับ stage เพื่อไม่ตัดสระ |
| Card hover | scale 1.03, 700ms | คง scale ได้ ลด 300ms; focus ไม่ต้องอาศัย hover |
| Menu | แสดง/ซ่อน | opacity 160ms; focus/aria ต้องเปลี่ยนทันที ไม่รอจบ animation |
| Scroll reveal | view timeline | เนื้อหาต้องมองเห็นใน browser ที่ไม่รองรับ; ทดสอบ anchor/direct entry |
| Marquee / studio loop | marquee 48s และหลาย loop | มี pause/resume ที่ค้นพบได้สำหรับการเคลื่อนไหวต่อเนื่อง หรือใช้ภาพนิ่ง; reduced motion หยุดทั้งหมด |

เมื่อ prefers-reduced-motion: reduce ให้ยกเลิก transform, animation และ delay ของเอฟเฟกต์ตกแต่ง แสดงเนื้อหาสุดท้ายทันที ใช้ scroll แบบทันที โดยไม่ตัดการแจ้งสถานะที่จำเป็น

## 8. Acceptance matrix

ทดสอบจาก production build ในเครื่องและ preview deployment ที่ใช้ configuration จริง โดยไม่ยิงฟอร์มทดสอบไปหาลูกค้าหรือสร้างข้อมูล production โดยไม่มีแผน

| สถานการณ์ | สิ่งที่ต้องผ่าน |
| --- | --- |
| 320, 390, 640, 768, 1024, 1280, 1440px | ไม่มี horizontal scroll; โลโก้/controls ไม่ชน; breakpoint menu ตรงกัน |
| ไทย + อังกฤษ | หัวเรื่อง/สระไม่ถูกตัด; CTA/ชื่อบริการไม่ truncate; path/query/locale ถูกต้อง |
| text enlargement 200% | ทุกข้อความ/ปุ่มใช้ได้; ไม่กำหนด max-height ที่ตัดเนื้อหา |
| Keyboard | skip link; โฟกัสเห็นชัด; menu ไม่หลุดพื้นหลัง; Escape และคืน focus |
| Light + Dark | contrast ค่าปกติ ≥4.5:1; control cues ที่จำเป็น ≥3:1; ตรวจ hover/selected/error/focus เพิ่ม |
| Slow network / image error | โครงไม่กระโดด; ภาพสำรองไม่ทำให้ทั้งหน้าพัง; ไม่อ้าง empty ว่าเป็นข้อมูลจริง |
| Form | idle, invalid, pending, error, rate-limit, success พร้อม refCode; เก็บค่าที่กรอกเมื่อ error |
| Content edge | 0/1/หลายผลงาน; ไม่มีรูป; hero ยาว; package หาย; ไม่มีช่องทาง LINE |
| Motion | reduce motion ไม่มีเอฟเฟกต์ตกแต่ง; loop มี pause หรือเป็นภาพนิ่ง |
| Routing | ตรวจ D01 ทุกกรณี รวมปุ่มจริงและ reload; admin gate และ server actions คงสิทธิ์ |

## 9. ไฟล์ที่เกี่ยวข้องและลำดับทำงาน

1. D01 — src/proxy.ts และ regression tests ที่ครอบ integration
2. D02 — CMS content, prisma/seed.ts (อ่านเทียบเท่านั้น), src/app/[locale]/page.tsx, query สถิติ
3. D03–D05 — SiteHeader.tsx, globals.css, ui/Form.tsx, forms/LeadForm.tsx
4. D06–D08 — hero/page.tsx, ThemeToggle.tsx, LocaleSwitcher.tsx, ui/Button.tsx, contact/page.tsx
5. ตรวจ matrix และบันทึกผลจริงก่อนเผยแพร่

ไม่จำเป็นต้องเพิ่ม route หรือ feature การขายใหม่ในรอบนี้ เก็บข้อเสนอที่เกินขอบเขตเป็นงานถัดไป

แหล่งอ้างอิง: [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [W3C Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## 10. บันทึกผลตรวจ — 10 กันยายน 2026

ตรวจจาก working tree ที่ `D:\Alexan Production` ฐาน commit `1bd7bd1` พร้อมการเปลี่ยนแปลงที่ยังไม่ commit

วิธีตรวจ: production build ในเครื่อง, `npm run typecheck`, `npm run lint`, `npm test` (17 เทสต์ ผ่านทั้งหมด)

ข้อจำกัดของรอบนี้: **ยังไม่ได้ตรวจด้วยตาในเบราว์เซอร์** เครื่องมือ preview ของเซสชันผูกกับชื่อโฟลเดอร์เดิมก่อนเปลี่ยนชื่อ จึงเปิด dev server ไม่ได้ ข้อที่เกี่ยวกับคีย์บอร์ด สายตา และการวัดพิกเซลจึงยืนยันจากโค้ดและการคำนวณเท่านั้น ยังไม่ได้กดใช้จริง

| ID | สถานะ | หลักฐาน |
| --- | --- | --- |
| D01 | ไม่พบข้อบกพร่องในโค้ดปัจจุบัน | `config.matcher` ในไฟล์มี backslash สองตัว ค่าตอนรันจึงเป็นจุดตามตัวอักษรตามที่ต้องการ ไม่ใช่ `.*..*` การอ่านครั้งก่อนน่าจะเทียบจากค่าที่ผ่านการ unescape มาแล้วหนึ่งชั้น ตรวจ 12 เส้นทางใน `tests/routing-paths.test.ts` ทั้งชั้น matcher และชั้น proxy ผ่านทั้งหมด รวม `/contact`, `/services`, `/en/contact`, `/th/contact?package=` และการกัน `/api`, `/_next`, ไฟล์ที่มีนามสกุล |
| D02 | ยังไม่ทำ — รอเจ้าของยืนยัน | ภาพและรีวิวยังมาจาก seed; `ปีในวงการ` ยังเป็นเลข 12 ตายตัวใน `src/app/[locale]/page.tsx` |
| D03 | ทำแล้ว | เมนูมือถือเปลี่ยนเป็น `<dialog>` + `showModal()` ได้ focus trap, Escape, background inert และการคืนโฟกัสจากพฤติกรรมมาตรฐานของ element; ปิดเมื่อขยายเป็น desktop แล้วคืนโฟกัสไปที่ลิงก์โลโก้ |
| D04 | ทำแล้ว | `--accent` ธีมสว่างเป็น `22 64% 40%`; คำนวณซ้ำได้ accent/background 5.09, accent/subtle 4.79, white-on-accent 5.30 และ `--input` ให้ขอบ control 3.48 ล็อกไว้ด้วย `tests/contrast.test.ts` ครอบทั้งสองธีม |
| D05 | ทำแล้ว | `Field` ต่อ `aria-describedby` และ `aria-invalid` เข้ากับ control ที่ id ตรงกัน; `LeadForm` ย้ายโฟกัสไปกล่องผลลัพธ์ที่ `tabIndex={-1}` พร้อม `role="status"` และแสดง refCode; ตอนกำลังส่งมีการประกาศสถานะ |
| D06 | ทำแล้ว | `.hero-title` และ `.hero-stage` ถูกใช้จริงใน `src/app/[locale]/page.tsx` โดยจำกัดขอบเขตไว้ที่ hero ไม่ได้แก้ heading rule ทั้งเว็บ |
| D07 | ทำแล้ว | ปุ่มเมนู/ปิด และ control ในฟอร์มเป็น 44px (`h-11`); `Select` มี chevron ที่ `pointer-events-none` จึงไม่บังการคลิก |
| D08 | ทำแล้วรอบนี้ | ย้ายการกรอง URL ไปไว้ที่ `src/lib/external-link.ts` (`safeExternalUrl`) อนุญาตเฉพาะ http/https แล้วใช้ทั้งหน้าติดต่อและฟุตเตอร์ ถ้ามีแต่ ID จะแสดงเป็นข้อความพร้อมป้ายกำกับผ่านคีย์ `contact.lineIdNote` ทั้งสองภาษา ไม่ปั้นลิงก์ ครอบด้วย `tests/external-link.test.ts` |

### เจอเพิ่มระหว่างทำ D08

`src/components/layout/SiteFooter.tsx` เรนเดอร์ `href` ของลิงก์โซเชียลจากค่าในหน้าตั้งค่าโดยไม่ตรวจ scheme
ฟุตเตอร์อยู่ทุกหน้า ค่าที่หลุดการกรองจึงกระทบทั้งเว็บ ไม่ใช่เฉพาะหน้าติดต่อ
บัญชีระดับ EDITOR ใส่ `javascript:` ลงช่องลิงก์ได้ตามปกติ แล้วกลายเป็นสคริปต์ที่รันในเบราว์เซอร์ผู้เข้าชม
แก้โดยให้ใช้ `safeExternalUrl` ตัวเดียวกับหน้าติดต่อ ค่าที่ไม่ผ่านจะถูกตัดออกจากรายการไปเลย

### เรื่องที่ต้องตัดสินก่อนเผยแพร่

`src/lib/settings.ts` ใน `getSiteSettings()` มีเงื่อนไขเขียนทับ `hero.headlineTh` และ `hero.headlineEn` ตอนอ่าน เมื่อค่าที่บันทึกไว้ตรงกับข้อความเดิมสองชุด

ตรงนี้ขัดกับข้อ 6 ของเอกสารนี้เองที่ระบุว่าข้อความ hero เป็นข้อเสนอ ไม่ใช่ค่าที่เขียนลง CMS แล้ว และให้แก้เฉพาะ defaults เพราะจะไม่กระทบค่าที่บันทึกไว้

ผลข้างเคียงคือถ้าเจ้าของตั้งหัวเรื่องกลับไปเป็นข้อความเดิม หน้าเว็บจะยังแสดงข้อความใหม่อยู่ดี โดยไม่มีอะไรบอกว่าเกิดอะไรขึ้น ทางเลือก: ถอดเงื่อนไขออกแล้วปล่อยให้ defaults ทำงานตามปกติ หรือทำเป็น content migration ครั้งเดียวที่ตรวจทานได้ ไม่ใช่การเขียนทับทุกครั้งที่อ่าน

### ที่ยังเหลือ

- ตรวจ acceptance matrix ข้อ 8 ด้วยเบราว์เซอร์จริง โดยเฉพาะคีย์บอร์ด, 200% text, ช่วงจอ 320–1440 และรอยต่อ 1279/1280
- D02 ทั้งข้อ รอเจ้าของยืนยันผลงาน รีวิว และตัวเลขประสบการณ์

## 11. รอบความปลอดภัย — 10 กันยายน 2026

ทำหลังจาก D08 ในเซสชันเดียวกัน หลัง working directory ย้ายมาที่ `D:\Alexan Production` แล้ว
รอบนี้ **เปิดเว็บดูด้วยตาในเบราว์เซอร์ได้แล้ว** เครื่องมือ preview ทำงานตามปกติ

รายละเอียดทั้งหมดอยู่ที่ [`docs/security.md`](../security.md) — ที่นี่เก็บเฉพาะส่วนที่กระทบงานออกแบบ

| เรื่อง | ผลต่อหน้าเว็บ |
|---|---|
| CSP ผูกกับ nonce ทุกคำขอ | สคริปต์ที่จะเขียนแทรกในหน้าต่อจากนี้ต้องพก nonce จาก `getNonce()` ไม่งั้นถูกบล็อกเงียบ ๆ |
| `/privacy` และ `/terms` กลายเป็น dynamic | nonce เปลี่ยนทุกคำขอ จึง prerender ไว้ตอน build ไม่ได้ — เนื้อหาสั้น ต้นทุนแทบไม่มี |
| `style-src` ยังเปิด `'unsafe-inline'` | inline style ที่ใช้อยู่ (ฉากหน้าแรก, next/font) ยังใช้ได้ตามเดิม ไม่ต้องแก้อะไร |
| ลิงก์ผลงาน (`liveUrl`, `repoUrl`) | ค่าที่ไม่ใช่ http/https จะไม่ขึ้นเป็นปุ่มเลย และบันทึกไม่ผ่านตั้งแต่ในฟอร์ม |
| ฟอร์มตั้งค่าและฟอร์มผลงาน | ช่องลิงก์ที่กรอกผิดรูปจะขึ้นข้อความบอกว่าต้องขึ้นต้นด้วย `http://` หรือ `https://` |

ตรวจด้วยตาในเบราว์เซอร์แล้ว: หน้าแรก, `/work`, `/admin/login`, หน้า 404 — เรนเดอร์ครบ ไม่มี CSP violation
ปุ่มสลับธีมทำงานและจำค่าไว้ได้ ล็อกอินด้วยรหัสผิดขึ้นข้อความ "อีเมลหรือรหัสผ่านไม่ถูกต้อง" ตามเดิม

> ยังไม่ได้ตรวจ acceptance matrix ข้อ 8 ด้วยคีย์บอร์ดและช่วงจอต่าง ๆ — เป็นคนละเรื่องกับรอบนี้
> และรูปจาก R2 โหลดช้ามากบนเครือข่ายของเครื่องที่ใช้ตรวจ (11 วินาทีต่อไฟล์) จน image optimizer ตัดที่ 7 วินาที
> เป็นข้อจำกัดของเครือข่าย ไม่ใช่ของโค้ด — บน Railway ที่อยู่ใกล้ Cloudflare กว่าไม่เจอปัญหานี้

## 12. รอบ SEO — 10 กันยายน 2026

รายละเอียดทั้งหมดอยู่ที่ [`docs/seo.md`](../seo.md) — ที่นี่เก็บเฉพาะส่วนที่กระทบงานออกแบบและเนื้อหา

| เรื่อง | ผลต่อหน้าเว็บ |
|---|---|
| หกหน้าหลักได้ JSON-LD ครบแล้ว | ไม่กระทบสิ่งที่เห็นบนหน้าจอ เป็น `<script>` ที่ไม่เรนเดอร์อะไร |
| หน้าใหม่ทุกหน้าต่อจากนี้ | ต้องมี `BreadcrumbList` และชนิดที่ตรงกับเนื้อหา ไม่งั้นไม่ขึ้นเส้นทางในผลค้นหา |
| ที่อยู่และเวลาทำการในหน้าตั้งค่า | ยังกรอกเป็นข้อความอิสระเหมือนเดิม โค้ดแกะเป็นรูปแบบของ schema.org ให้เอง |

### สิ่งที่รอเนื้อหา ไม่ใช่รอโค้ด

- **FAQ บนหน้าแรกและหน้ารวมบริการ** โครง `faqSchema` พร้อมแล้วและใช้อยู่ในหน้าบริการรายตัว
  ขาดแต่คำถาม-คำตอบจริง ซึ่งไม่ควรแต่งขึ้นมาเอง
- **หน้ารายละเอียดอุปกรณ์รายชิ้น** ตอนนี้อยู่ใน dialog ไม่มี URL ของตัวเอง
  คนที่ค้นชื่อรุ่นตรง ๆ จึงไม่เจอหน้าไหนของเราที่ตรงกับคำค้นนั้น — เป็นงานถัดไปที่น่าจะคุ้มที่สุด
- **D02 เดิม** (ภาพและรีวิวจาก seed, ตัวเลขปีในวงการ) ยังค้างอยู่ และตอนนี้กระทบ SEO ด้วย
  เพราะรีวิวจาก seed จะถูกประกาศเป็น `Review` จริงใน JSON-LD

### แก้ความเข้าใจผิดที่เขียนไว้ในโค้ดเดิม

คอมเมนต์ในหน้ารีวิวเคยเขียนว่า AggregateRating "ทำให้ผลค้นหา Google แสดงดาวใต้ชื่อเว็บ"
ซึ่งไม่จริง — Google ตัดสิทธิ์รีวิวที่ธุรกิจเก็บไว้ในเว็บตัวเองมาตั้งแต่ปี 2019
ดาวจริงต้องมาจากรีวิวบน Google Business Profile แก้คอมเมนต์และอธิบายเหตุผลที่ยังเก็บ schema ไว้แล้ว

## 13. หน้ารายละเอียดอุปกรณ์รายชิ้น — 10 กันยายน 2026

`/rental/[slug]` อุปกรณ์ทุกชิ้นมีหน้าของตัวเองแล้ว (9 ชิ้น × 2 ภาษา)
รายละเอียดอยู่ที่ [`docs/seo.md`](../seo.md) หัวข้อ 1.5 — ที่นี่เก็บเฉพาะการตัดสินใจด้านออกแบบ

### กล่องซ้อนถูกแทนที่ด้วยหน้าจริง

ข้อ 12 ของเอกสารนี้เคยระบุว่ากล่องซ้อน (`EquipmentDetailDialog`) ถูกเลือกเพราะ
รายการที่ลูกค้าติ๊กไว้อยู่ใน state ของหน้าแคตตาล็อก เด้งไปหน้าอื่นแล้วของที่เลือกจะหาย

รอบนี้แก้ที่ต้นเหตุ: ย้ายรายการที่เลือกไปไว้ที่ `src/lib/rental-selection.ts`
เก็บใน sessionStorage อ่านผ่าน `useSyncExternalStore` — อยู่รอดข้ามหน้าแล้ว
เมื่อข้อจำกัดหมดไป กล่องซ้อนก็ไม่มีเหตุผลให้อยู่ต่อ จึงลบทิ้งและย้ายเนื้อหาทั้งหมดไปหน้าจริง

| เปลี่ยนอะไร | เดิม | ตอนนี้ |
|---|---|---|
| กดที่การ์ดอุปกรณ์ | เปิดกล่องซ้อน | ไปหน้าของอุปกรณ์ชิ้นนั้น |
| รูปเพิ่มเติม | กดสลับทีละรูปในกล่อง | เรียงให้เห็นครบตั้งแต่เลื่อนผ่าน |
| ขอใบเสนอราคา | ปิดกล่อง เลื่อนลงไปฟอร์มรวม | ฟอร์มอยู่ในหน้าเดียวกัน ติ๊กชิ้นนั้นไว้ให้แล้ว |
| ของที่เลือกไว้ | หายเมื่อเปลี่ยนหน้า | อยู่รอดข้ามหน้า |
| แชร์ลิงก์ของชิ้นเดียว | ทำไม่ได้ | ทำได้ |

ตรวจด้วยเบราว์เซอร์แล้ว: เลือก 3 ชิ้น → เข้าหน้ารายละเอียด → กดย้อนกลับ → ยังเลือกอยู่ 3 ชิ้น
และ URL ทั้งสามที่ (canonical, `Product.url`, `Offer.url`) ตรงกันหมด

**ถ้าอยากได้กล่องซ้อนคืน** บอกได้ครับ — เอากลับมาเป็นปุ่ม "ดูอย่างเร็ว" คู่กับลิงก์ได้
แต่จะมีสองเป้าหมายกดในการ์ดใบเดียว ซึ่งเป็นสิ่งที่ตั้งใจเลี่ยงไว้

### เรื่องข้อมูลที่ต้องกลับไปแก้ในหลังบ้าน

อุปกรณ์ชิ้นหนึ่งกรอกช่องยี่ห้อไว้เป็น `-` ทำให้ชื่อสินค้ากลายเป็น "- softbox parabolico 90cm"
`equipmentName()` กันไม่ให้ขีดกลางหลุดออกไปแล้ว แต่โค้ดเติมยี่ห้อที่หายไปให้ไม่ได้ — ต้องกรอกเอง
