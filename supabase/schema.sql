-- Toàn bộ schema — 12 bảng, 7 enum.
--
-- CHẠY LẠI ĐƯỢC VÔ HẠI. Mọi câu lệnh đều bỏ qua nếu đối tượng đã tồn tại, nên
-- dán vào Supabase SQL Editor lúc nào cũng an toàn:
--   • Database rỗng  -> dựng đủ toàn bộ.
--   • Database đã có -> không đổi gì, không lỗi.
--
-- (Bản đầu tiên KHÔNG chạy lại được: nó ném `type "Industry" already exists`
--  và rollback cả script. Đã sửa.)
--
-- ⚠ Sau khi chạy trên database mới, PHẢI chạy tiếp `rls.sql` — bảng vừa tạo
--   luôn sinh ra với RLS TẮT, tức hở ra REST API bằng anon key.
--
-- Sinh lại kiểu TypeScript sau mỗi lần đổi schema:  npm run types:db

CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Industry" AS ENUM ('MY_PHAM', 'THOI_TRANG', 'GIA_DUNG', 'ME_VA_BE', 'PHU_KIEN');
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- kiểu "Industry" đã có, bỏ qua
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "GenerationType" AS ENUM ('PRODUCT_PHOTO', 'LISTING_COPY', 'VIDEO_SCRIPT');
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- kiểu "GenerationType" đã có, bỏ qua
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- kiểu "GenerationStatus" đã có, bỏ qua
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CreditTxnType" AS ENUM ('TOPUP', 'BONUS', 'DEBIT', 'REFUND', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- kiểu "CreditTxnType" đã có, bỏ qua
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Plan" AS ENUM ('FREE', 'LIFETIME');
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- kiểu "Plan" đã có, bỏ qua
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- kiểu "PaymentStatus" đã có, bỏ qua
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AssetKind" AS ENUM ('ORIGINAL', 'CUTOUT', 'SCENE');
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- kiểu "AssetKind" đã có, bỏ qua
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "industry" "Industry",
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planActivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "credit_wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalIn" INTEGER NOT NULL DEFAULT 0,
    "totalOut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "CreditTxnType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "generationId" TEXT,
    "paymentId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industry" "Industry" NOT NULL,
    "name" TEXT NOT NULL,
    "originalImageKey" TEXT NOT NULL,
    "cutoutImageKey" TEXT,
    "info" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "generations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "type" "GenerationType" NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "industry" "Industry" NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "providerJobId" TEXT,
    "providerCostVnd" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saved_scripts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "generationId" TEXT,
    "angle" TEXT NOT NULL,
    "script" JSONB NOT NULL,
    "totalSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "generated_assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "generationId" TEXT,
    "kind" "AssetKind" NOT NULL,
    "sceneId" TEXT,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "generated_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "api_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "generationId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "images" INTEGER,
    "costVnd" INTEGER,
    "costSource" TEXT,
    "latencyMs" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "credit_wallet_userId_key" ON "credit_wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_idempotencyKey_key" ON "credit_transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_transactions_userId_createdAt_idx" ON "credit_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_userId_createdAt_idx" ON "products"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generations_userId_createdAt_idx" ON "generations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generations_type_status_idx" ON "generations"("type", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_userId_createdAt_idx" ON "payments"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_providerRef_key" ON "payments"("provider", "providerRef");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sessions_userId_createdAt_idx" ON "sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saved_scripts_userId_createdAt_idx" ON "saved_scripts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saved_scripts_productId_idx" ON "saved_scripts"("productId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "generated_assets_storageKey_key" ON "generated_assets"("storageKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generated_assets_userId_createdAt_idx" ON "generated_assets"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generated_assets_productId_kind_idx" ON "generated_assets"("productId", "kind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_usage_provider_createdAt_idx" ON "api_usage"("provider", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_usage_generationId_idx" ON "api_usage"("generationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "credit_wallet" ADD CONSTRAINT "credit_wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "credit_wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "generations" ADD CONSTRAINT "generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "generations" ADD CONSTRAINT "generations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "saved_scripts" ADD CONSTRAINT "saved_scripts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "saved_scripts" ADD CONSTRAINT "saved_scripts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "saved_scripts" ADD CONSTRAINT "saved_scripts_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ràng buộc đã có, bỏ qua
END $$;

