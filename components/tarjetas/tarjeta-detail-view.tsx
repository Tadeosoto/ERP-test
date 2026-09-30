"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import { MovimientoForm } from "@/components/tarjetas/movimiento-form";
import { MovimientosTable } from "@/components/tarjetas/movimientos-table";
import type { CompanyCardDto, CompanyCardMovementDto, EmployeeDto, ObraDto, Role } from "@/lib/domain/types";
import { canEditCardDigits } from "@/lib/tarjetas/access";
import { cardSubtitle } from "@/lib/tarjetas/summary";
import { formatMoney } from "@/lib/format";

const money = (amount: number) => formatMoney(amount, "MXN");

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

export function TarjetaDetailView({ cardId }: { cardId: string }) {
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const router = useRouter();
  const [card, setCard] = useState<CompanyCardDto | null>(null);
  const [cards, setCards] = useState<CompanyCardDto[]>([]);
  const [movements, setMovements] = useState<CompanyCardMovementDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role: Role }[]>([]);
  const [lastFour, setLastFour] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [cRes, mRes, eRes, oRes, uRes] = await Promise.all([
      fetch("/api/company-cards", { credentials: "include" }),
      fetch(`/api/company-cards/movements?cardId=${cardId}`, { credentials: "include" }),
      fetch("/api/employees", { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/users", { credentials: "include" }),
    ]);
    if (cRes.ok) {
      const data = (await cRes.json()) as { cards: CompanyCardDto[] };
      setCards(data.cards);
      const current = data.cards.find((item) => item.id === cardId) ?? null;
      setCard(current);
      setLastFour(current?.lastFour ?? "");
    }
    if (mRes.ok) setMovements(((await mRes.json()) as { movements: CompanyCardMovementDto[] }).movements);
    if (eRes.ok) setEmployees(((await eRes.json()) as { employees: EmployeeDto[] }).employees);
    if (oRes.ok) setObras(((await oRes.json()) as { obras: ObraDto[] }).obras);
    if (uRes.ok) setUsers(((await uRes.json()) as { users: { id: string; name: string; role: Role }[] }).users);
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDigits(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/company-cards/${cardId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastFour }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; card?: CompanyCardDto } | null;
    if (!res.ok || !data?.card) {
      showError(data?.error ?? "No se pudieron guardar los dígitos.");
      return;
    }
    setCard(data.card);
    showSuccess("Últimos 4 dígitos guardados.");
  }

  if (loading) return <LoadingScreen message="Cargando tarjeta" />;
  if (!card) {
    return (
      <button type="button" onClick={() => router.push("/tarjetas")} className="text-sm font-semibold text-orange-700">
        Volver a tarjetas
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/tarjetas" className="text-sm font-medium text-orange-700 hover:underline">Tarjetas empresariales</Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">{card.label}</h1>
        {cardSubtitle(card.label, card.lastFour) && (
          <p className="text-sm text-zinc-500">{cardSubtitle(card.label, card.lastFour)}</p>
        )}
      </div>

      {user && canEditCardDigits(user) && (
        <form onSubmit={(e) => void saveDigits(e)} className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Últimos 4 dígitos</span>
            <input
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              required
              className="w-32 rounded-xl border border-zinc-200 px-3 py-2 tracking-widest"
            />
          </label>
          <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Guardar</button>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {card.kind === "debito" && <Metric label="Carga de saldo" value={money(card.summary.loads)} />}
        <Metric label="Gastos realizados" value={money(card.summary.spent)} />
        <Metric label="Gastos comprobados" value={money(card.summary.proven)} />
        <Metric label="Por comprobar" value={money(card.summary.pending)} />
      </div>
      {card.kind === "debito" && (
        <p className={`text-sm font-semibold ${card.summary.available < 0 ? "text-red-700" : "text-teal-800"}`}>
          Saldo disponible {money(card.summary.available)}
        </p>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
          Registrar movimiento
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <MovimientosTable rows={movements} />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Movimiento en {card.label}</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">Cerrar</button>
            </div>
            <MovimientoForm
              cards={cards}
              users={users}
              employees={employees}
              obras={obras}
              presetCardId={card.id}
              onDone={() => {
                setOpen(false);
                void load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
