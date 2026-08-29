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
        enable_chat: false,
        enable_screenshare: true,
        enable_knocking: false,
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

export async function createDailyMeetingToken(roomName: string, userName: string, isOwner: boolean): Promise<string> {
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
        is_owner: isOwner,
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
