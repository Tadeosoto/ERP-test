"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
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
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-bold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

export function TarjetasListView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { user } = useSession();
  const [cards, setCards] = useState<CompanyCardDto[]>([]);
  const [movements, setMovements] = useState<CompanyCardMovementDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role: Role }[]>([]);
  const [cardFilter, setCardFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [cRes, mRes, eRes, oRes, uRes] = await Promise.all([
      fetch("/api/company-cards", { credentials: "include" }),
      fetch("/api/company-cards/movements", { credentials: "include" }),
      fetch("/api/employees", { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/users", { credentials: "include" }),
    ]);
    if (cRes.ok) setCards(((await cRes.json()) as { cards: CompanyCardDto[] }).cards);
    if (mRes.ok) setMovements(((await mRes.json()) as { movements: CompanyCardMovementDto[] }).movements);
    if (eRes.ok) setEmployees(((await eRes.json()) as { employees: EmployeeDto[] }).employees);
    if (oRes.ok) setObras(((await oRes.json()) as { obras: ObraDto[] }).obras);
    if (uRes.ok) {
      const data = (await uRes.json()) as { users: { id: string; name: string; role: Role }[] };
      setUsers(data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const visible = useMemo(
    () => (cardFilter ? movements.filter((row) => row.cardId === cardFilter) : movements),
    [cardFilter, movements]
  );
  const debit = cards.filter((card) => card.kind === "debito");
  const credit = cards.filter((card) => card.kind === "credito");

  if (loading) return <LoadingScreen message="Cargando tarjetas" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Tarjetas empresariales</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Seis BanBajío de débito y tres Banregio de crédito. El gasto se registra igual en todas.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
          <IconPlus className="h-4 w-4" />
          Registrar movimiento
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">BanBajío débito</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {debit.map((card) => (
            <Link key={card.id} href={`/tarjetas/${card.id}`} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 hover:border-orange-200">
              <div>
                <p className="font-semibold text-zinc-900">{card.label}</p>
                {cardSubtitle(card.label, card.lastFour) && (
                  <p className="text-xs text-zinc-500">{cardSubtitle(card.label, card.lastFour)}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Carga de saldo" value={money(card.summary.loads)} />
                <Metric label="Gastos" value={money(card.summary.spent)} />
                <Metric label="Comprobados" value={money(card.summary.proven)} />
                <Metric label="Por comprobar" value={money(card.summary.pending)} />
              </div>
              <p className={`text-sm font-semibold ${card.summary.available < 0 ? "text-red-700" : "text-teal-800"}`}>
                Saldo disponible {money(card.summary.available)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">Banregio crédito</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {credit.map((card) => (
            <Link key={card.id} href={`/tarjetas/${card.id}`} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 hover:border-orange-200">
              <div>
                <p className="font-semibold text-zinc-900">{card.label}</p>
                {cardSubtitle(card.label, card.lastFour) && (
                  <p className="text-xs text-zinc-500">{cardSubtitle(card.label, card.lastFour)}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Gastos" value={money(card.summary.spent)} />
                <Metric label="Comprobados" value={money(card.summary.proven)} />
                <Metric label="Por comprobar" value={money(card.summary.pending)} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {user && canEditCardDigits(user) && (
        <p className="text-sm text-zinc-500">Abre una tarjeta para registrar sus últimos 4 dígitos.</p>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4">
          <h2 className="font-bold text-zinc-900">Movimientos</h2>
          <select value={cardFilter} onChange={(e) => setCardFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <option value="">Todas las tarjetas</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>{card.label}</option>
            ))}
          </select>
        </div>
        <MovimientosTable rows={visible} />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Nuevo movimiento</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">Cerrar</button>
            </div>
            <MovimientoForm
              cards={cards}
              users={users}
              employees={employees}
              obras={obras}
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
