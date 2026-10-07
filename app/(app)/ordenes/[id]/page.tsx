"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OrderDetailPanel } from "@/components/order-detail-panel";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { orderDisplayCode } from "@/lib/dashboard/compras-dashboard";
import type { PurchaseOrderDto } from "@/lib/domain/types";

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [order, setOrder] = useState<PurchaseOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { order: PurchaseOrderDto };
      setOrder(d.order);
      setNotFound(false);
    } else {
      setOrder(null);
      setNotFound(true);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) return null;

  if (loading) {
    return <LoadingScreen message="Cargando Orden" />;
  }

  if (notFound || !order) {
    return (
      <div className="card space-y-4 p-8 text-center text-base text-zinc-600">
        <p>Orden no encontrada.</p>
        <PageBreadcrumb
          className="flex justify-center"
          items={[
            { label: "Inicio", href: "/inicio" },
            { label: "Obras", href: "/obras" },
            { label: "Órdenes", href: "/ordenes" },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb
        items={[
          { label: "Inicio", href: "/inicio" },
          { label: "Obras", href: "/obras" },
          { label: order.obraName, href: `/obras/${order.obraId}` },
          { label: orderDisplayCode(order) },
        ]}
      />
      <div className="mt-2">
        <OrderDetailPanel order={order} onUpdated={load} />
      </div>
    </div>
  );
}
