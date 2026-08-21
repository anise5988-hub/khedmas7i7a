CREATE TABLE "public"."Course" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'Français',
  "priceTnd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amountMillimes" INTEGER NOT NULL DEFAULT 0,
  "visibility" TEXT NOT NULL DEFAULT 'DRAFT',
  "thumbnailUrl" TEXT,
  "sections" JSONB NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "studentCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."CourseAccess" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "amountPaidTnd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "CourseAccess_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."CourseProgress" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "completedLessonIds" JSONB NOT NULL,
  "lastLessonId" TEXT,
  "percentage" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CourseProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseAccess_courseId_studentId_key" ON "public"."CourseAccess"("courseId", "studentId");
CREATE UNIQUE INDEX "CourseProgress_courseId_studentId_key" ON "public"."CourseProgress"("courseId", "studentId");
CREATE INDEX "Course_teacherId_visibility_createdAt_idx" ON "public"."Course"("teacherId", "visibility", "createdAt");
CREATE INDEX "Course_subject_level_visibility_idx" ON "public"."Course"("subject", "level", "visibility");
CREATE INDEX "CourseAccess_studentId_purchasedAt_idx" ON "public"."CourseAccess"("studentId", "purchasedAt");
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CourseAccess" ADD CONSTRAINT "CourseAccess_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CourseProgress" ADD CONSTRAINT "CourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CourseProgress" ADD CONSTRAINT "CourseProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CourseAccess" ADD CONSTRAINT "CourseAccess_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;