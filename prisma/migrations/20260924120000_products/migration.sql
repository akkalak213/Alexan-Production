-- ผลิตภัณฑ์ที่ขาย (โปรแกรม ระบบรายเดือน เทมเพลต สินค้า) พร้อมแพ็กเกจราคา
-- และผูกคำขอของลูกค้าเข้ากับผลิตภัณฑ์/แพ็กเกจที่สนใจ — เพิ่มอย่างเดียว ไม่แก้หรือลบของเดิม

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SOFTWARE', 'SUBSCRIPTION', 'DIGITAL', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('ONE_TIME', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE 'PRODUCT';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "productId" TEXT,
ADD COLUMN     "productPlanId" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "taglineTh" TEXT NOT NULL,
    "taglineEn" TEXT NOT NULL,
    "descriptionTh" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "featuresTh" JSONB,
    "featuresEn" JSONB,
    "specs" JSONB,
    "faqTh" JSONB,
    "faqEn" JSONB,
    "coverImage" TEXT,
    "gallery" TEXT[],
    "videoUrl" TEXT,
    "demoUrl" TEXT,
    "buyUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPlan" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "billing" "BillingCycle" NOT NULL DEFAULT 'ONE_TIME',
    "includesTh" TEXT[],
    "includesEn" TEXT[],
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "buyUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_order_idx" ON "Product"("status", "order");

-- CreateIndex
CREATE INDEX "ProductPlan_productId_order_idx" ON "ProductPlan"("productId", "order");

-- AddForeignKey
ALTER TABLE "ProductPlan" ADD CONSTRAINT "ProductPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_productPlanId_fkey" FOREIGN KEY ("productPlanId") REFERENCES "ProductPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

