-- New classroom models for the ProfySpace virtual classroom rewrite.
-- Adds: LessonPhase enum, ClassroomSession host-control/presentation columns,
-- ClassroomParticipant, ClassroomAttendance, ClassroomResource,
-- ClassroomWhiteboardPage, ClassroomEvent, ClassroomMessage.kind/sessionId.
-- Non-destructive: additive columns/tables only. The legacy
-- ClassroomSessionStatus enum keeps its SCHEDULED/IN_PROGRESS/COMPLETED values
-- and gains WAITING/CANCELLED so existing rows stay valid.

ALTER TYPE "ClassroomSessionStatus" ADD VALUE 'WAITING';
ALTER TYPE "ClassroomSessionStatus" ADD VALUE 'CANCELLED';

-- CreateEnum
CREATE TYPE "LessonPhase" AS ENUM ('SCHEDULED', 'WAITING', 'STARTING', 'LIVE', 'ENDING_SOON', 'COMPLETED', 'CANCELLED');

-- Additive columns on ClassroomSession
ALTER TABLE "ClassroomSession" ADD COLUMN "phase" "LessonPhase" NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "ClassroomSession" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClassroomSession" ADD COLUMN "waitingRoomEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClassroomSession" ADD COLUMN "studentScreenShareAllowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClassroomSession" ADD COLUMN "studentCameraAllowed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClassroomSession" ADD COLUMN "studentMicAllowed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClassroomSession" ADD COLUMN "studentWhiteboardAllowed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClassroomSession" ADD COLUMN "studentChatEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClassroomSession" ADD COLUMN "studentReactionsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClassroomSession" ADD COLUMN "lessonSummary" TEXT;
ALTER TABLE "ClassroomSession" ADD COLUMN "endedById" TEXT;
ALTER TABLE "ClassroomSession" ADD COLUMN "endedAt" TIMESTAMP(3);
ALTER TABLE "ClassroomSession" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- CreateTable ClassroomParticipant
CREATE TABLE "ClassroomParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "admission" TEXT NOT NULL DEFAULT 'ADMITTED',
    "firstJoinedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "micBlocked" BOOLEAN NOT NULL DEFAULT false,
    "cameraBlocked" BOOLEAN NOT NULL DEFAULT false,
    "reactionsBlocked" BOOLEAN NOT NULL DEFAULT false,
    "handRaisedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClassroomAttendance
CREATE TABLE "ClassroomAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "reconnectCount" INTEGER NOT NULL DEFAULT 0,
    "leaveReason" TEXT,

    CONSTRAINT "ClassroomAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClassroomResource
CREATE TABLE "ClassroomResource" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isPresenting" BOOLEAN NOT NULL DEFAULT false,
    "presentedAt" TIMESTAMP(3),
    "page" INTEGER NOT NULL DEFAULT 1,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClassroomWhiteboardPage
CREATE TABLE "ClassroomWhiteboardPage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "title" TEXT,
    "strokes" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomWhiteboardPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClassroomEvent
CREATE TABLE "ClassroomEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomEvent_pkey" PRIMARY KEY ("id")
);

-- Additive columns on ClassroomMessage
ALTER TABLE "ClassroomMessage" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "ClassroomMessage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomParticipant_sessionId_userId_key" ON "ClassroomParticipant"("sessionId", "userId");
CREATE INDEX "ClassroomParticipant_sessionId_admission_idx" ON "ClassroomParticipant"("sessionId", "admission");
CREATE INDEX "ClassroomParticipant_userId_createdAt_idx" ON "ClassroomParticipant"("userId", "createdAt");
CREATE INDEX "ClassroomAttendance_sessionId_joinedAt_idx" ON "ClassroomAttendance"("sessionId", "joinedAt");
CREATE INDEX "ClassroomAttendance_userId_joinedAt_idx" ON "ClassroomAttendance"("userId", "joinedAt");
CREATE INDEX "ClassroomResource_sessionId_createdAt_idx" ON "ClassroomResource"("sessionId", "createdAt");
CREATE UNIQUE INDEX "ClassroomWhiteboardPage_sessionId_pageIndex_key" ON "ClassroomWhiteboardPage"("sessionId", "pageIndex");
CREATE INDEX "ClassroomWhiteboardPage_sessionId_pageIndex_idx" ON "ClassroomWhiteboardPage"("sessionId", "pageIndex");
CREATE INDEX "ClassroomEvent_sessionId_createdAt_idx" ON "ClassroomEvent"("sessionId", "createdAt");
CREATE INDEX "ClassroomEvent_type_createdAt_idx" ON "ClassroomEvent"("type", "createdAt");
CREATE INDEX "ClassroomMessage_sessionId_createdAt_idx" ON "ClassroomMessage"("sessionId", "createdAt");
CREATE INDEX "ClassroomSession_phase_scheduledStart_idx" ON "ClassroomSession"("phase", "scheduledStart");

-- AddForeignKey
ALTER TABLE "ClassroomParticipant" ADD CONSTRAINT "ClassroomParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomAttendance" ADD CONSTRAINT "ClassroomAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomAttendance" ADD CONSTRAINT "ClassroomAttendance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ClassroomParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassroomResource" ADD CONSTRAINT "ClassroomResource_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomWhiteboardPage" ADD CONSTRAINT "ClassroomWhiteboardPage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomEvent" ADD CONSTRAINT "ClassroomEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomMessage" ADD CONSTRAINT "ClassroomMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
