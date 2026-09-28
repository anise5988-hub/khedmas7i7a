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
 * Mints a short-lived token that may start/stop cloud recording in `roomName`.
 * Daily exposes recording through an owner-level participant token rather
 * than a bare API key, so this helper is what the host recording route uses.
 */
export async function createDailyRecordingToken(roomName: string): Promise<string> {
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        is_owner: true,
        // Daily renamed/folded the old "recording" canAdmin value into
        // "streaming" — the literal string "recording" is now rejected with
        // a 400 (see createDailyMeetingToken above for the same fix).
        permissions: { canAdmin: ["streaming"] },
        exp: Math.floor(Date.now() / 1000) + 60 * 30,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Daily recording token creation failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.token;
}

/**
 * Fetches the newest recording asset for a room, used after a lesson to turn
 * the transient `RECORDING` status into an `AVAILABLE` download the replays
 * page can serve.
 */
export async function fetchDailyRecordingAssets(
  roomName: string,
): Promise<{ download_link: string | null; recording_id: string | null } | null> {
  const res = await fetch(
    `${DAILY_API_BASE}/recordings?room=${encodeURIComponent(roomName)}&limit=1`,
    { headers: { Authorization: `Bearer ${apiKey()}` } },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const first = data?.recordings?.[0];
  if (!first) return null;
  return { download_link: first.download_link ?? null, recording_id: first.id ?? null };
}

/**
 * Starts a cloud recording in `roomName`. Daily requires an owner-level
 * participant token with canAdmin: ["recording"]; the token is minted
 * short-lived, used once and never stored.
 */
export async function startDailyRecording(roomName: string): Promise<{ meetingId: string | null }> {
  const token = await createDailyRecordingToken(roomName);
  const res = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}/recording/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Daily start-recording failed (${res.status}): ${body}`);
  }
  const data = await res.json().catch(() => ({}));
  return { meetingId: data?.meetingId ?? null };
}

/**
 * Stops the active cloud recording in `roomName`. Uses the same owner-level
 * token mechanism; stopping when nothing is recording returns a Daily error,
 * which the caller surfaces as "already stopped".
 */
export async function stopDailyRecording(roomName: string): Promise<void> {
  const token = await createDailyRecordingToken(roomName);
  const res = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}/recording/stop`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Already-stopped / no-active-recording are benign on stop.
    if (!/not.*recording|no.*active/i.test(body)) {
      throw new Error(`Daily stop-recording failed (${res.status}): ${body}`);
    }
  }
}
