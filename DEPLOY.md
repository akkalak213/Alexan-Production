# Deploy ขึ้น Railway

## โครงสร้างที่ต้องมีบน Railway

โปรเจกต์เดียวมีสอง service:

| Service | คืออะไร |
|---|---|
| **Postgres** | ฐานข้อมูล เพิ่มจาก `+ New` → `Database` → `PostgreSQL` |
| **Web** | ตัวเว็บ deploy จาก GitHub repo นี้ Railway จะเจอ `Dockerfile` เอง |

---

## 1. Environment variables ของ service `Web`

ตั้งใน Railway → service `Web` → **Variables**

### จำเป็น

| ตัวแปร | ค่าที่ใส่ |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — พิมพ์แบบนี้ตรง ๆ Railway จะอ้างอิงให้เอง |
| `AUTH_SECRET` | สร้างด้วย `npx auth secret` แล้วคัดลอกมาวาง |
| `AUTH_URL` | โดเมนจริง เช่น `https://alexan.studio` |
| `NEXT_PUBLIC_SITE_URL` | โดเมนเดียวกับ `AUTH_URL` |

> ไม่ต้องตั้ง `AUTH_TRUST_HOST` — เปิดไว้ในโค้ดแล้วที่ `src/auth.config.ts`
> เพราะ Railway มี reverse proxy อยู่หน้า container ถ้าไม่เปิดจะล็อกอินไม่ได้เลย

> **ต้องใช้ `${{Postgres.DATABASE_URL}}` ไม่ใช่ค่า public ที่ลงท้าย `proxy.rlwy.net`**
> ค่า internal วิ่งในเครือข่ายของ Railway เอง เร็วกว่าและไม่เสียค่า egress
> ส่วนค่า public มีไว้ต่อจากเครื่องตัวเองเท่านั้น

### ไฟล์และอีเมล

| ตัวแปร | หมายเหตุ |
|---|---|
| `R2_ACCOUNT_ID` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_BUCKET` `R2_PUBLIC_URL` | ไม่ตั้ง = อัปโหลดรูปไม่ได้ แต่เว็บยังทำงานปกติ |
| `RESEND_API_KEY` `MAIL_FROM` `MAIL_TO` | ไม่ตั้ง = ฟอร์มยังบันทึกลงฐานข้อมูล แต่ไม่มีเมลแจ้งเตือน |
| `NEXT_PUBLIC_GA_ID` | ไม่ตั้ง = ไม่โหลดสคริปต์ Google Analytics เลย |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | รหัสยืนยันเว็บใน Google Search Console — ไม่ตั้งก็เปิดเว็บได้ปกติ แต่จะไม่เห็นว่าคนค้นด้วยคำไหนแล้วเจอเรา |
| `TRUSTED_PROXY_HOPS` | **ไม่ต้องตั้ง** โดเมนวิ่งผ่าน Cloudflare อยู่แล้ว โค้ดจึงอ่าน IP ผู้ใช้จาก `cf-connecting-ip` ที่ Cloudflare เขียนเอง ค่านี้เป็นทางถอยสำหรับกรณีไม่มีหัวข้อนั้น และค่าเริ่มต้น `1` ถูกอยู่แล้ว |

### ค่าที่ต้องใส่ตอน build ด้วย

ค่าสี่ตัวนี้ถูกอ่านตั้งแต่ตอน build ไม่ใช่ตอนรัน
ใน Railway ต้องเพิ่มเป็น **Build argument** ด้วย (Settings → Build → Build Arguments):

```
NEXT_PUBLIC_SITE_URL=https://alexan.studio
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
```

| ลืมตัวไหน | อาการที่เจอ |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | ถ้าไม่ระบุ ใช้ `https://alexan.studio` เป็นค่าเริ่มต้น; อย่าใส่ localhost ใน production |
| `R2_PUBLIC_URL` | รูปที่อัปโหลดขึ้นไม่แสดงบนหน้าเว็บ เพราะ `next/image` ปฏิเสธโดเมนที่ไม่อยู่ใน allowlist |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console ยืนยันเว็บไม่ผ่าน เพราะ meta tag ไม่ถูกฝังลงหน้า — ตั้งเป็น runtime variable อย่างเดียวไม่พอ |

`R2_PUBLIC_URL` ต้องใส่**ทั้งสองที่** — เป็น build argument (สำหรับ allowlist ของรูป)
และเป็น runtime variable (สำหรับตอนอัปโหลด)

---

## 2. Migration

ไม่ต้องรันเอง — `Dockerfile` สั่ง `prisma migrate deploy` ก่อนสตาร์ตทุกครั้ง
ถ้า migration ล้มเหลว container จะไม่ขึ้น ซึ่งตั้งใจให้เป็นแบบนั้น
ดีกว่าเปิดเว็บด้วย schema ที่ไม่ตรงกับโค้ด

**สร้างผู้ดูแลคนแรก** ต้องทำครั้งเดียวหลัง deploy สำเร็จ จากเครื่องตัวเอง:

```bash
DATABASE_URL="<ค่า public ที่ลงท้าย proxy.rlwy.net>" SEED_ADMIN_PASSWORD="รหัสที่ต้องการ" npm run db:seed
```

---

## 3. Health check

ตั้งไว้แล้วใน `railway.json` ชี้ไปที่ `/api/health`
คืน `503` เมื่อต่อฐานข้อมูลไม่ได้ Railway จะไม่สลับ traffic มาที่ container ที่ยังไม่พร้อม

เรียกดูเองได้:

```bash
curl https://alexan.studio/api/health
```

---

## 4. โดเมนและ CDN

1. Railway → Settings → **Networking** → Custom Domain → ใส่ `alexan.studio` (root domain)
2. เพิ่ม DNS ของ `@` ด้วยค่า record และ verification ที่ Railway แสดงจริง ห้ามเดา target
   ถ้าใช้ Cloudflare ให้ใช้ CNAME flattening สำหรับ root domain และรอให้ Railway ยืนยันโดเมน/ออก certificate สำเร็จ
3. หากเปิด Cloudflare proxy ให้ตั้ง SSL/TLS เป็น **Full (strict)** และอย่าใช้ Cache Everything กับ HTML, `/admin` หรือ `/api`
4. หน้าไทยอยู่ที่ `https://alexan.studio/` และภาษาอังกฤษที่ `https://alexan.studio/en`
   `www` เป็นตัวเลือกเสริม หากต้องการใช้ ให้เพิ่มโดเมนนั้นแยกและตั้ง redirect กลับ root domain

อ้างอิง: [Railway — Working with Domains](https://docs.railway.com/networking/domains/working-with-domains)

### เปลี่ยนชื่อ repository

Repository ปัจจุบันคือ `akkalak213/Alexan-Production` หลังเปลี่ยนชื่อ ให้ตรวจ source repository
ของ Railway ว่ายังเชื่อมกับ repository นี้ และตรวจการ deploy ครั้งถัดไปก่อนถือว่าการย้ายเสร็จ

### ขอบเขตเวลารอฐานข้อมูล

เว็บจำกัด pool ที่ 10 connections ต่อ process และรอ connection สูงสุด 5 วินาที
คำสั่งฐานข้อมูลถูกจำกัดไว้ 15 วินาที พร้อมขีดจำกัดฝั่ง client 20 วินาที
หน้าสาธารณะยังใช้ fallback เดิมเมื่ออ่านไม่ได้ และ `/api/health` คืน 503

### CORS ของ R2 ต้องเพิ่มโดเมนจริง

หลังมีโดเมนแล้ว กลับไปแก้ CORS ของ bucket ไม่งั้นอัปโหลดจากหลังบ้าน production จะโดนบล็อก:

```json
[
  {
    "AllowedOrigins": ["https://alexan.studio", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 5. เช็กลิสต์ก่อนเปิดให้คนนอกเข้า

- [ ] `/api/health` คืน `status: ok`
- [ ] เข้า `/admin` ได้ และเปลี่ยนรหัสผ่านผู้ดูแลแล้ว
- [ ] อัปโหลดรูปที่ `/admin/media` สำเร็จ (ทดสอบ CORS ของโดเมนจริง)
- [ ] ส่งฟอร์มติดต่อแล้วได้อีเมลแจ้งเตือน
- [ ] แก้ข้อมูลบริษัทที่ `/admin/settings` ให้เป็นข้อมูลจริง — ค่า seed เป็นตัวอย่างทั้งหมด
- [ ] ลบผลงานและรีวิวตัวอย่างที่มาจาก seed
- [ ] เอา `picsum.photos` ออกจาก `next.config.ts` เมื่อเปลี่ยนรูปครบแล้ว
- [ ] ตั้ง `NEXT_PUBLIC_SITE_URL` และ `AUTH_URL` เป็น `https://alexan.studio` ให้ตรงกันทั้งคู่
      (ค่านี้เป็นที่มาของ canonical, hreflang, sitemap, JSON-LD และรูปพรีวิวตอนแชร์ — ผิดแล้วผิดทั้งเว็บ)
- [ ] ส่ง `https://alexan.studio/sitemap.xml` เข้า Google Search Console
- [ ] ตรวจ JSON-LD ด้วย Rich Results Test — ต้องเจอ ProfessionalService พร้อม logo และ WebSite
- [ ] เปิด `https://alexan.studio/llms.txt` แล้วดูว่ารายการบริการ ผลงาน และอุปกรณ์ตรงกับของจริง
- [ ] ตรวจหน้า `/rental` ด้วย Rich Results Test — ต้องเจอ `Product` พร้อมราคาต่อวัน
      (เป็นชนิดข้อมูลที่ได้ผลค้นหาแบบมีราคาจริง ต่างจากรีวิวของตัวเองที่ Google ไม่แสดงดาวให้)
- [ ] สร้าง Google Business Profile และยืนยันที่อยู่ — มีน้ำหนักกับคำค้นที่ระบุพื้นที่
      มากกว่าทุกอย่างในเว็บรวมกัน (ดู `docs/seo.md` ข้อ 2)
- [ ] ลองแชร์ลิงก์ลง LINE หรือ Facebook ดูว่าการ์ดพรีวิวขึ้นโลโก้และหัวเรื่องถูกต้อง
- [ ] กรอกลิงก์โซเชียลที่ `/admin/settings` ให้ตรงช่อง — ลิงก์ TikTok ต้องอยู่ในช่อง TikTok
      ไม่ใช่ช่อง LINE (ฟุตเตอร์ตัดลิงก์ซ้ำออกให้ แต่ไอคอนจะผิดแพลตฟอร์ม)
- [ ] ตั้งค่า Resend ให้ครบ ถ้าต้องการปุ่ม "ส่งใบเสนอราคาทางอีเมล" ในหน้า `/admin/quotes`

### ความปลอดภัย

รายละเอียดทั้งหมดอยู่ที่ [`docs/security.md`](docs/security.md) — ตรงนี้เก็บเฉพาะที่ต้องยืนยันด้วยตาหลัง deploy

- [ ] `curl -sI https://alexan.studio | grep -i content-security-policy` ต้องมีค่ากลับมา และมี `nonce-` อยู่ใน `script-src`
- [ ] เปิดหน้าแรกแล้วดู console ของเบราว์เซอร์ ต้องไม่มีข้อความ CSP violation
- [ ] `curl -sI https://alexan.studio/admin` ต้องได้ `cache-control` ที่มี `no-store` และ `x-robots-tag: noindex`
- [ ] `curl -s https://alexan.studio/api/health` ต้องตอบแค่ `{"status":"ok"}` ไม่มีรายละเอียดการตั้งค่าอื่น
- [ ] ลองใส่รหัสผ่านผิดติดกัน 10 ครั้ง ต้องขึ้นข้อความให้รออีก 15 นาที (ต้อง deploy รอบที่มี migration `login_attempt` แล้ว)
- [ ] อัปโหลดรูปในหลังบ้านได้จริง — CSP เปิด `connect-src` ให้ R2 ไว้แล้ว ถ้าอัปโหลดไม่ได้ให้ดู console ก่อนเดาว่าเป็น CORS
- [ ] `npm audit` แล้วยืนยันว่าที่เหลือมีแต่ของ `prisma` CLI ซึ่งไม่ได้รันใน production
- [ ] **Cloudflare → Security → Settings → Email Address Obfuscation ต้องเป็น Off**
      Cloudflare เปิดให้อัตโนมัติตอนสมัคร zone ใหม่ ถ้าเปิดอยู่จะแก้ HTML ที่เราส่งออกไป
      แล้ว React hydrate ไม่ตรงทุกหน้า พร้อม CSP violation ใน console (ดู `docs/security.md`)
