import { redirect } from "next/navigation";
import { AuthorizationError, currentAdmin } from "@/lib/server";
import { AdminApp } from "@/components/admin-app";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ route?: string[] }>;
}) {
  let session;
  try {
    session = await currentAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/access-denied");
    throw error;
  }
  if (!session) redirect("/login");
  return <AdminApp route={(await params).route || []} user={session.user} />;
}
