"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OrderDetailPanel } from "@/components/order-detail-panel";
import type { PurchaseOrderDto } from "@/lib/domain/types";

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [order, setOrder] = useState<PurchaseOrderDto | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { order: PurchaseOrderDto };
      setOrder(d.order);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) return null;

  if (!order) {
    return (
      <div className="card p-8 text-center text-base text-zinc-600">Cargando orden…</div>
    );
  }

  return (
    <div>
      <Link href="/obras" className="text-base font-medium text-orange-700 hover:underline">
        ← Volver a obras
      </Link>
      <div className="mt-4">
        <OrderDetailPanel order={order} onUpdated={load} />
      </div>
    </div>
  );
}
