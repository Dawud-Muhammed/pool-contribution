import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminDashboard poolId={id} />;
}