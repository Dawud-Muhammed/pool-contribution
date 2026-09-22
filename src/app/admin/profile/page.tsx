import AdminProfileClient from "@/components/AdminProfileClient";
import { adminGuard } from "@/lib/adminGuard";

export default async function AdminProfilePage() {
  await adminGuard();
  return <AdminProfileClient />;
}