# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Alexan Production — image สำหรับ deploy บน Railway
#
# แบ่งเป็นหลายชั้นเพื่อให้ layer ของ dependency ถูกแคชไว้
# แก้โค้ดแล้ว build ใหม่จะไม่ต้อง npm ci ซ้ำทุกครั้ง
# ─────────────────────────────────────────────────────────────

# node 24 มาพร้อม npm 11 ซึ่งเป็นเมเจอร์เดียวกับที่ใช้สร้าง package-lock.json
# ห้ามลดกลับไป node 22 (npm 10) — npm สองเมเจอร์นี้แก้ peer dependency ที่ขัดกันคนละแบบ
# (next ขอ @swc/helpers 0.5.15 เป๊ะ ๆ ส่วน @swc/core ที่มากับ next-intl ขอ >=0.5.17)
# npm 10 จะมองว่า lock ไม่ครบแล้วหยุดที่ npm ci ทันที
FROM node:24-alpine AS base
# Prisma และ Next บน Alpine ต้องการ libc6-compat
RUN apk add --no-cache libc6-compat
WORKDIR /app


# ───────────────── ติดตั้ง dependency ─────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# postinstall เรียก prisma generate จึงต้องมี schema อยู่ก่อนแล้ว
RUN npm ci


# ───────────────────── build ─────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ค่าที่ต้องฝังเข้า bundle ตั้งแต่ตอน build (NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_SITE_URL=https://alexan.studio
ARG NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

# next.config อ่านค่านี้ตอน build เพื่อใส่โดเมน R2 ลงใน images.remotePatterns
# ตั้งเป็น runtime variable อย่างเดียวไม่พอ — รูปที่อัปโหลดจะโดน next/image ปฏิเสธ
ARG R2_PUBLIC_URL
ENV R2_PUBLIC_URL=$R2_PUBLIC_URL

# ตอน build ยังไม่มี DATABASE_URL และ AUTH_SECRET จริง — ข้ามการ validate env ไปก่อน
# ค่าจริงจะถูกอ่านตอน runtime จาก Variables ของ Railway
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ───────── Prisma CLI สำหรับรัน migration ตอนสตาร์ต ─────────
# ติดตั้งแยกในโฟลเดอร์ของตัวเอง เพื่อให้ได้ dependency ครบทั้งสายโดยไม่ต้องไล่คัดลอกทีละตัว
FROM base AS prisma-cli
WORKDIR /migrate
COPY package.json ./
# อ่านเวอร์ชันจาก package.json เพื่อไม่ให้ CLI กับ schema หลุดเวอร์ชันกันภายหลัง
# dotenv จำเป็นเพราะ prisma.config.ts เปิดไฟล์ด้วย import 'dotenv/config'
RUN PRISMA_VERSION=$(node -p 'require("./package.json").devDependencies.prisma') \
  && echo "ติดตั้ง prisma@${PRISMA_VERSION}" \
  && npm install --no-audit --no-fund "prisma@${PRISMA_VERSION}" dotenv


# ──────────────────── runtime ────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ไม่รันด้วย root
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# standalone รวมเฉพาะ node_modules ที่ใช้จริง ทำให้ image เล็กลงมาก
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma CLI อยู่แยกที่ /migrate ไม่ปนกับ node_modules ของ standalone
# แยกเพราะ CLI ลาก dependency ยาวเป็นสาย (@prisma/config → c12, effect, empathic, …)
# การหยิบมาทีละแพ็กเกจไม่มีวันครบ ส่วน standalone ก็ไม่รวมมาให้เพราะแอปไม่ได้เรียกใช้
COPY --from=prisma-cli --chown=nextjs:nodejs /migrate/node_modules /migrate/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma /migrate/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts /migrate/prisma.config.ts

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# รัน migration ที่ยังไม่ได้ apply ก่อนเปิดรับ traffic
# ถ้า migration ล้มเหลว container จะไม่สตาร์ต ดีกว่าเปิดเว็บด้วย schema ที่ไม่ตรง
#
# เรียก entry point ตรง ๆ ไม่ผ่าน npx เพราะ npx จะไปหา node_modules/.bin/prisma
# ซึ่งเป็น symlink ที่ COPY ของ Docker ทำพังตั้งแต่ตอนคัดลอก
CMD ["sh", "-c", "cd /migrate && node node_modules/prisma/build/index.js migrate deploy && cd /app && node server.js"]
