-- CreateEnum
CREATE TYPE "PhotoSource" AS ENUM ('manual', 'camera');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'processing', 'done', 'failed', 'skipped');

-- DropForeignKey
ALTER TABLE "photos" DROP CONSTRAINT "photos_cropId_fkey";

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "cameraId" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "source" "PhotoSource" NOT NULL DEFAULT 'manual',
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "width" INTEGER,
ALTER COLUMN "cropId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "cameras" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "cropId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photos_storageKey_key" ON "photos"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "photos_dedupeKey_key" ON "photos"("dedupeKey");

-- CreateIndex
CREATE INDEX "photos_cameraId_capturedAt_idx" ON "photos"("cameraId", "capturedAt");

-- CreateIndex
CREATE INDEX "photos_analysisStatus_idx" ON "photos"("analysisStatus");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "cameras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

