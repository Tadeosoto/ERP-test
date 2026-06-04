"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListSearchInput } from "@/components/list-search-input";
import { IconPlus, IconSave } from "@/components/ui/action-icons";
import { ObraOrderRow } from "@/components/obra-order-row";
import { useSession } from "@/components/session-provider";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";
import { filterOrders, sortByCreatedAtDesc } from "@/lib/list-utils";

export default function ObraDetailPage() {
  const params = useParams();
  const obraId = typeof params?.obraId === "string" ? params.obraId : "";
  const { user } = useSession();
  const [obra, setObra] = useState<ObraDto | null>(null);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");

  const sortedOrders = useMemo(() => sortByCreatedAtDesc(orders), [orders]);
  const visibleOrders = useMemo(
    () => filterOrders(sortedOrders, orderSearch),
    [sortedOrders, orderSearch]
  );

  const load = useCallback(async () => {
    if (!obraId) return;
    const [oRes, ordRes] = await Promise.all([
      fetch(`/api/obras/${obraId}`, { credentials: "include" }),
      fetch(`/api/orders?obraId=${obraId}`, { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obra: ObraDto };
      setObra(d.obra);
      setEditName(d.obra.name);
      setEditActive(d.obra.active);
    } else {
      setObra(null);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
  }, [obraId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!obraId) return;
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/obras/${obraId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName, active: editActive }),
      });
      const data = (await res.json()) as { error?: string; obra?: ObraDto };
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setObra(data.obra ?? null);
      setMsg("Cambios guardados.");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!obraId) return null;

  if (!obra) {
    return (
      <div className="card p-8 text-center">
        <p className="text-base text-zinc-600">Obra no encontrada.</p>
        <Link href="/obras" className="mt-4 inline-block text-orange-700 underline">
          Volver a obras
        </Link>
      </div>
    );
  }

  const canConfigure = user?.role === "compras";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/obras" className="text-base font-medium text-orange-700 hover:underline">
          ← Todas las obras
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-zinc-900">{obra.name}</h1>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              obra.active ? "bg-teal-100 text-teal-800" : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {obra.active ? "Activa" : "Inactiva"}
          </span>
        </div>
        <p className="mt-2 text-base text-zinc-600">
          {orders.length} orden{orders.length === 1 ? "" : "es"} · obra creada el{" "}
          {formatDate(obra.createdAt)}
        </p>
      </div>

      {canConfigure && (
        <section className="card p-6">
          <h2 className="text-xl font-semibold">Configurar obra</h2>
          <p className="mt-1 text-base text-zinc-600">
            Cambia el nombre o marca inactiva una obra ya terminada (no se borran las órdenes).
          </p>
          <form onSubmit={saveConfig} className="mt-4 space-y-4 sm:max-w-md">
            <label className="block">
              <span className="font-medium">Nombre</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="mt-2 block w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base"
              />
            </label>
            <label className="flex items-center gap-3 text-base">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="h-5 w-5 rounded border-teal-400 text-teal-600"
              />
              Obra activa (visible para nuevas órdenes)
            </label>
            {err && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-base text-red-700">{err}</p>
            )}
            {msg && (
              <p className="rounded-2xl bg-teal-50 px-4 py-3 text-base text-teal-800">{msg}</p>
            )}
            <button type="submit" disabled={busy} className="btn-secondary">
              <IconSave />
              Guardar cambios
            </button>
          </form>
        </section>
      )}

      {user?.role === "compras" && obra.active && (
        <div>
          <Link href={`/ordenes/nueva?obraId=${obra.id}`} className="btn-primary">
            <IconPlus />
            Nueva orden en esta obra
          </Link>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-zinc-900">Órdenes de esta obra</h2>
          {sortedOrders.length > 0 && (
            <p className="text-sm text-zinc-500">Más recientes primero</p>
          )}
        </div>
        {sortedOrders.length > 0 && (
          <ListSearchInput
            id="obra-detail-order-search"
            label="Buscar órdenes en esta obra"
            placeholder="Título, proveedor o estado…"
            value={orderSearch}
            onChange={setOrderSearch}
            matchCount={visibleOrders.length}
            totalCount={sortedOrders.length}
          />
        )}
        {sortedOrders.length === 0 ? (
          <p className="card py-12 text-center text-base text-zinc-500">
            Sin órdenes todavía.
            {canConfigure && obra.active && (
              <>
                {" "}
                <Link
                  href={`/ordenes/nueva?obraId=${obra.id}`}
                  className="font-medium text-orange-700 underline"
                >
                  Crear la primera
                </Link>
              </>
            )}
          </p>
        ) : visibleOrders.length === 0 ? (
          <p className="card py-12 text-center text-base text-zinc-500">
            No hay órdenes que coincidan con «{orderSearch}».
          </p>
        ) : (
          visibleOrders.map((o) => <ObraOrderRow key={o.id} order={o} />)
        )}
      </section>
    </div>
  );
}
