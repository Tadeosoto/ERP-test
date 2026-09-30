"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import type { EmployeeDto } from "@/lib/domain/types";

export function EmpleadosListView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { showSuccess, showError } = useFeedback();
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/employees", { credentials: "include" });
    if (res.ok) {
      const data = (await res.json()) as { employees: EmployeeDto[] };
      setEmployees(data.employees);
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      showError(data?.error ?? "No se pudieron cargar los empleados.");
    }
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.fullName.toLowerCase().includes(q));
  }, [employees, search]);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/employees", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!res.ok) {
      showError(data?.error ?? "No se pudo dar de alta al empleado.");
      return;
    }
    setFirstName("");
    setLastName("");
    showSuccess("Empleado dado de alta.");
    await load();
  }

  async function setActive(employee: EmployeeDto, active: boolean) {
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      showError(data?.error ?? "No se pudo actualizar al empleado.");
      return;
    }
    showSuccess(active ? "Empleado dado de alta." : "Empleado dado de baja.");
    await load();
  }

  if (loading) return <LoadingScreen message="Cargando empleados" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Empleados</h1>
        <p className="mt-1 text-sm text-zinc-500">Nombre y apellido. Se eligen al registrar un viático.</p>
      </div>

      <form onSubmit={(e) => void createEmployee(e)} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Nombre</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={80}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Apellido</span>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            maxLength={80}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
        >
          <IconPlus className="h-4 w-4" />
          Alta
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm sm:max-w-xs"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Todavía no hay empleados.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {filtered.map((employee) => (
              <li key={employee.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold text-zinc-900">{employee.fullName}</p>
                  <p className={`text-xs font-medium ${employee.active ? "text-teal-700" : "text-zinc-400"}`}>
                    {employee.active ? "Activo" : "De baja"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void setActive(employee, !employee.active)}
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  {employee.active ? "Dar de baja" : "Dar de alta"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
