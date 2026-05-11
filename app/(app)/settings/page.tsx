"use client";

import { useState } from "react";
import {
  exportJson,
  importJson,
  resetDemoData,
} from "@/lib/data/repository";

export default function SettingsPage() {
  const [msg, setMsg] = useState<string | null>(null);

  function handleExport() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ccp-erp-expedientes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exportación descargada.");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const r = importJson(text);
      setMsg(r.ok ? "Datos importados." : r.error);
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  function handleReset() {
    if (!window.confirm("¿Restablecer datos demo? Se perderán cambios no exportados.")) return;
    resetDemoData();
    setMsg("Datos demo restablecidos.");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Ajustes</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Copia de seguridad local y reinicio del demo (todo en tu navegador).
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={handleExport}
          className="w-full rounded-full bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Exportar JSON
        </button>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-700">Importar JSON</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-full file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-900 hover:file:bg-orange-200"
          />
        </label>
        <button
          type="button"
          onClick={handleReset}
          className="w-full rounded-full border border-orange-200 py-3 text-sm font-semibold text-orange-900 hover:bg-orange-50"
        >
          Restablecer datos demo
        </button>
        {msg && <p className="text-center text-sm text-orange-800">{msg}</p>}
      </div>
    </div>
  );
}
