import { ClassroomClient } from "./classroom-client";

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassroomClient id={id} />;
}
