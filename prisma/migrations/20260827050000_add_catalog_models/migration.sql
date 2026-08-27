CREATE TABLE "public"."Subject" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cycle" TEXT NOT NULL,
  "section" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."EducationLevel" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "cycle" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EducationLevel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."BacSection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BacSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subject_name_key" ON "public"."Subject"("name");
CREATE UNIQUE INDEX "EducationLevel_name_key" ON "public"."EducationLevel"("name");
CREATE UNIQUE INDEX "EducationLevel_slug_key" ON "public"."EducationLevel"("slug");
CREATE UNIQUE INDEX "BacSection_name_key" ON "public"."BacSection"("name");
CREATE UNIQUE INDEX "BacSection_slug_key" ON "public"."BacSection"("slug");

CREATE INDEX "Subject_cycle_active_idx" ON "public"."Subject"("cycle", "active");
CREATE INDEX "EducationLevel_cycle_active_sortOrder_idx" ON "public"."EducationLevel"("cycle", "active", "sortOrder");
CREATE INDEX "BacSection_active_idx" ON "public"."BacSection"("active");
