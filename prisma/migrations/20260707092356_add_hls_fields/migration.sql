-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "hlsPath" TEXT,
ADD COLUMN     "thumbnail" TEXT;

-- CreateIndex
CREATE INDEX "Video_videoStatus_idx" ON "Video"("videoStatus");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");
