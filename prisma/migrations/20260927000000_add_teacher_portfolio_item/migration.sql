-- CreateEnum
CREATE TYPE "PortfolioItemType" AS ENUM ('IMAGE', 'DOCUMENT', 'VIDEO', 'LINK');

-- CreateTable
CREATE TABLE "TeacherPortfolioItem" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PortfolioItemType" NOT NULL DEFAULT 'IMAGE',
    "subject" TEXT,
    "level" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "externalUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherPortfolioItem_teacherId_isPublic_sortOrder_idx" ON "TeacherPortfolioItem"("teacherId", "isPublic", "sortOrder");

-- AddForeignKey
ALTER TABLE "TeacherPortfolioItem" ADD CONSTRAINT "TeacherPortfolioItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;