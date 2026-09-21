import PoolDetailClient from "@/components/PoolDetailClient";

export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PoolDetailClient poolId={id} />;
}