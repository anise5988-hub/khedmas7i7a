import { TeacherProfileClient } from "./teacher-profile-client";

export default async function TeacherProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TeacherProfileClient slug={slug} />;
}
