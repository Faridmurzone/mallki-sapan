-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "cameras" ADD COLUMN     "captureIntervalSec" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "photo_comments" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_comments_photoId_createdAt_idx" ON "photo_comments"("photoId", "createdAt");

-- AddForeignKey
ALTER TABLE "photo_comments" ADD CONSTRAINT "photo_comments_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

