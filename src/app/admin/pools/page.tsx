import AdminPoolsClient from "@/components/AdminPoolsClient";
import { adminGuard } from "@/lib/adminGuard";

export default async function AdminPoolsPage() {
  await adminGuard();
  return <AdminPoolsClient />;
}