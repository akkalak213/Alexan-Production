-- บันทึกการพยายามเข้าสู่ระบบ เพื่อชะลอการเดารหัสผ่านของหลังบ้าน
--
-- เก็บเฉพาะ hash ของอีเมลและ IP (ผสม AUTH_SECRET แล้วย้อนกลับไม่ได้)
-- ตารางนี้จึงไม่ได้เพิ่มข้อมูลส่วนบุคคลที่ต้องดูแลเพิ่มจากที่มีอยู่แล้ว
CREATE TABLE "LoginAttempt" (
  "id"        TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "ipHash"    TEXT NOT NULL,
  "success"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- นับความพยายามที่ล้มเหลวย้อนหลังตามช่วงเวลา ทั้งรายบัญชีและราย IP
-- ทั้งสองคิวรีกรองด้วยคอลัมน์แรกแล้วไล่ตามเวลา ดัชนีจึงเรียงแบบนี้
CREATE INDEX "LoginAttempt_emailHash_createdAt_idx" ON "LoginAttempt"("emailHash", "createdAt");
CREATE INDEX "LoginAttempt_ipHash_createdAt_idx" ON "LoginAttempt"("ipHash", "createdAt");
