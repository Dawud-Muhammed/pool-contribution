import AdminDashboard from "@/components/AdminDashboard";
import { adminGuard } from "@/lib/adminGuard";

export default async function AdminPoolPage({ params }: { params: Promise<{ id: string }> }) {
  await adminGuard();
  const { id } = await params;
  return <AdminDashboard poolId={id} />;
}