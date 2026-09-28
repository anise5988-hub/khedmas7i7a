"use client";

/** Shared client-side types for the virtual classroom. */

export type LessonPhase = "SCHEDULED" | "WAITING" | "STARTING" | "LIVE" | "ENDING_SOON" | "COMPLETED" | "CANCELLED";

export type RecordingStatus = "NOT_AVAILABLE" | "RECORDING" | "PROCESSING" | "AVAILABLE" | "FAILED";

export type HostControls = {
  locked: boolean;
  waitingRoomEnabled: boolean;
  studentScreenShareAllowed: boolean;
  studentCameraAllowed: boolean;
  studentMicAllowed: boolean;
  studentWhiteboardAllowed: boolean;
  studentChatEnabled: boolean;
  studentReactionsEnabled: boolean;
  lessonSummary: string | null;
};

export type ClassroomParticipantRow = {
  userId: string;
  displayName: string;
  role: string;
  micBlocked?: boolean;
  cameraBlocked?: boolean;
  reactionsBlocked?: boolean;
  handRaisedAt?: string | null;
  leftAt?: string | null;
  admission?: "PENDING" | "ADMITTED" | "REMOVED";
  firstJoinedAt?: string | null;
};

export type ClassroomSessionData = {
  canJoin: boolean;
  removed: boolean;
  lockedOut: boolean;
  needsAdmission: boolean;
  videoConfigured: boolean;
  joinToken: string | null;
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string;
  teacherName: string;
  studentName: string;
  subject: string;
  startsAt: string;
  scheduledEnd: string;
  durationMinutes: number;
  phase: LessonPhase;
  sessionStatus: string;
  scheduledStart: string;
  actualStart: string | null;
  actualEnd: string | null;
  endedAt: string | null;
  controls: HostControls;
  recordingStatus: RecordingStatus;
  recordingUrl: string | null;
  roomName: string;
  roomUrl: string | null;
  opensAt: string;
  closesAt: string;
  isTooEarly: boolean;
  isTooLate: boolean;
  participants: ClassroomParticipantRow[];
  waitingQueue: { userId: string; displayName: string; role: string; createdAt: string }[];
  myAdmission: string | null;
  serverTime: string;
};

export type ClassroomMessageRow = {
  id: string;
  senderId: string;
  senderName: string;
  kind: string;
  text: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
};

export type ClassroomNoteRow = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

export type ClassroomResourceRow = {
  id: string;
  fileName: string;
  mimeType: string;
  kind: "PDF" | "IMAGE";
  url: string;
  sizeBytes: number;
  isPresenting: boolean;
  page: number;
  pageCount: number;
  createdAt: string;
};

export type WhiteboardStroke = {
  id: string;
  tool: "pen" | "highlighter" | "eraser" | "rectangle" | "circle" | "line" | "text";
  color: string;
  size: number;
  points: { x: number; y: number }[];
  text?: string;
  createdAt: number;
  authorId: string;
};

export type ConnectionQuality = "EXCELLENT" | "GOOD" | "POOR" | "RECONNECTING" | "UNKNOWN";

/** Human phase label used across the top bar and the pre-join screen. */
export function phaseLabel(phase: LessonPhase, t?: { startsIn?: string; inProgress?: string; endingSoon?: string; ended?: string; scheduled?: string; waiting?: string; starting?: string; cancelled?: string }) {
  const labels = {
    SCHEDULED: t?.scheduled ?? "Programmée",
    WAITING: t?.waiting ?? "En attente",
    STARTING: t?.starting ?? "Démarrage",
    LIVE: t?.inProgress ?? "Leçon en cours",
    ENDING_SOON: t?.endingSoon ?? "Fin imminente",
    COMPLETED: t?.ended ?? "Terminée",
    CANCELLED: t?.cancelled ?? "Annulée",
  };
  return labels[phase];
}

export function phaseColor(phase: LessonPhase): string {
  switch (phase) {
    case "LIVE":
      return "bg-rose-500/15 border-rose-500/30 text-rose-300";
    case "ENDING_SOON":
      return "bg-amber-500/15 border-amber-500/30 text-amber-300";
    case "COMPLETED":
      return "bg-blue-500/15 border-blue-500/30 text-blue-300";
    case "CANCELLED":
      return "bg-rose-500/20 border-rose-500/40 text-rose-300";
    case "STARTING":
      return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
    default:
      return "bg-white/10 border-white/15 text-slate-300";
  }
}

export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
}

export const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg)$/i;
