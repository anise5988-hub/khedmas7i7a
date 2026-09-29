const DAILY_API_BASE = "https://api.daily.co/v1";

function apiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY is not configured.");
  return key;
}

export function isDailyConfigured(): boolean {
  return Boolean(process.env.DAILY_API_KEY);
}

export async function createDailyRoom(roomName: string, expiresAt: Date): Promise<{ name: string; url: string }> {
  const res = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        enable_chat: false, // chat lives in ProfySpace, not Daily's UI
        enable_screenshare: true,
        enable_knocking: false, // waiting room is ProfySpace's, not Daily's
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Daily room creation failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return { name: data.name, url: data.url };
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
  const res = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "");
    throw new Error(`Daily room deletion failed (${res.status}): ${body}`);
  }
}

export async function createDailyMeetingToken(
  roomName: string,
  userName: string,
  isOwner: boolean,
  userId?: string,
  opts?: { canScreenShare?: boolean },
): Promise<string> {
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        // user_id lets a participant object be traced back to a platform user
        // in the Daily dashboard / meeting events.
        ...(userId ? { user_id: userId } : {}),
        is_owner: isOwner,
        // Both room-level and token-level flags must be set for screen sharing
        // to work: the room property enables the feature, the token property
        // grants it to this participant. Without this the button silently does
        // nothing.
        enable_screenshare: true,
        // `permissions.canSend` is the switch that actually authorises which
        // media a participant may publish. Explicit, so no account-level
        // default can silently drop a capability.
        permissions: {
          canSend: ["video", "audio", ...(opts?.canScreenShare === false ? [] : ["screenVideo", "screenAudio"])],
          // Daily's `canAdmin` only accepts participants/streaming/transcription
          // now — "recording" is rejected outright with a 400, which was
          // silently failing every host's join-token mint (host joins always
          // request is_owner: true) and showing up as a permanently disabled
          // "Rejoindre la classe" button. Recording start/stop goes through
          // its own dedicated token (createDailyRecordingToken below), so the
          // join token only needs "participants" for host UI controls.
          canAdmin: isOwner ? ["participants"] : [],
        },
        // Short-lived — minted fresh on every join request rather than
        // reused, so it can't be captured once and replayed long after.
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Daily meeting token creation failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.token;
}

/**
 * Finds the newest recording for a room, used after a lesson to turn the
 * transient `RECORDING` status into an `AVAILABLE` download the replays page
 * can serve.
 *
 * Every part of this was verified directly against the live API and fixed
 * from what was there before: the filter param is `room_name`, not `room`
 * (that one was silently rejected with a 400, so this always returned no
 * assets); the list is under `data`, not `recordings`; and a listed
 * recording has no `download_link` of its own at all — that only exists
 * behind the separate access-link call below, because it's a signed,
 * expiring S3 URL, not a stable property of the recording.
 */
export async function fetchDailyRecordingAssets(
  roomName: string,
): Promise<{ recordingId: string; status: string } | null> {
  const res = await fetch(
    `${DAILY_API_BASE}/recordings?room_name=${encodeURIComponent(roomName)}&limit=1`,
    { headers: { Authorization: `Bearer ${apiKey()}` } },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const first = data?.data?.[0];
  if (!first?.id) return null;
  return { recordingId: first.id, status: first.status ?? "unknown" };
}

/**
 * Mints a fresh, short-lived download URL for an already-finished recording.
 * Daily's link expires (a signed S3 URL, good for a few hours) — callers
 * must not cache this beyond the current request, and should call this
 * again on the next visit rather than trust a URL stored from before.
 */
export async function getDailyRecordingAccessLink(recordingId: string): Promise<string | null> {
  const res = await fetch(`${DAILY_API_BASE}/recordings/${encodeURIComponent(recordingId)}/access-link`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.download_link ?? null;
}

/**
 * Starts a cloud recording in `roomName`.
 *
 * Verified directly against the live API before landing this: the previous
 * singular "recording/start" path doesn't exist at all (404 "api endpoint
 * does not exist" on every single call, silently failing every auto/manual
 * recording attempt this app ever made). The real path is plural
 * ("recordings/start"), takes no body — a "token" field is flatly rejected
 * with a 400 — and authenticates with the plain API key already used
 * everywhere else in this file, no separate per-call token needed.
 */
export async function startDailyRecording(roomName: string): Promise<{ meetingId: string | null }> {
  const res = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}/recordings/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Daily start-recording failed (${res.status}): ${body}`);
  }
  const data = await res.json().catch(() => ({}));
  return { meetingId: data?.recordingId ?? null };
}

/**
 * Stops the active cloud recording in `roomName`. Stopping when nothing is
 * recording returns a Daily error, which the caller surfaces as "already
 * stopped".
 */
export async function stopDailyRecording(roomName: string): Promise<void> {
  const res = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}/recordings/stop`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Already-stopped / no-active-recording are benign on stop.
    if (!/not.*recording|no.*active/i.test(body)) {
      throw new Error(`Daily stop-recording failed (${res.status}): ${body}`);
    }
  }
}
