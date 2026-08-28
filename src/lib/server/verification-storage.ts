import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_VERIFICATION_BUCKET || "teacher-verification-docs";
const SIGNED_URL_TTL_SECONDS = 300;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

let bucketEnsured = false;

// Unlike avatars/course-videos, verification documents (ID cards, diplomas)
// must never be publicly reachable — the bucket is created private, and
// callers only ever get short-lived signed URLs, never a public URL.
async function ensureBucket(client: NonNullable<ReturnType<typeof getAdminClient>>) {
  if (bucketEnsured) return;
  const { data: existing } = await client.storage.getBucket(BUCKET);
  if (!existing) {
    await client.storage.createBucket(BUCKET, { public: false });
  }
  bucketEnsured = true;
}

export async function uploadVerificationDocument(
  path: string,
  fileBytes: Buffer,
  contentType: string,
): Promise<{ error: string } | { error: null }> {
  const client = getAdminClient();
  if (!client) return { error: "Le stockage des documents n'est pas configuré." };
  await ensureBucket(client);
  const result = await client.storage.from(BUCKET).upload(path, fileBytes, { contentType, upsert: false });
  if (result.error) return { error: result.error.message };
  return { error: null };
}

export async function getVerificationDocumentSignedUrl(path: string): Promise<string | null> {
  const client = getAdminClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteVerificationDocument(path: string): Promise<void> {
  const client = getAdminClient();
  if (!client) return;
  await client.storage.from(BUCKET).remove([path]);
}
