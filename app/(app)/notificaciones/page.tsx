"use client";

import Link from "next/link";
import { IconCheck, IconRefresh } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useNotifications } from "@/lib/hooks/use-notifications";

export default function NotificacionesPage() {
  const { notifications, unreadCount, loading, refresh } = useNotifications(0);
  const { showSuccess, showError } = useFeedback();

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/notifications", { method: "POST", credentials: "include" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "No se pudieron marcar las notificaciones.");
      }
      await refresh();
      showSuccess("Todas las notificaciones quedaron marcadas como leídas.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudieron marcar las notificaciones.");
    }
  }

  if (loading) {
    return <LoadingScreen message="Cargando Notificaciones" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Notificaciones</h1>
          <p className="mt-2 text-base text-zinc-600">
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Estás al día"}
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => void refresh()} className="btn-ghost">
            <IconRefresh />
            Actualizar
          </button>
          {unreadCount > 0 && (
            <button type="button" onClick={() => void handleMarkAllRead()} className="btn-secondary">
              <IconCheck />
              Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-3">
        {notifications.length === 0 ? (
          <li className="card py-12 text-center text-base text-zinc-500">No hay avisos.</li>
        ) : (
          notifications.map((n) => (
            <li
              key={n.id}
              className={`card p-5 ${n.read ? "opacity-80" : "border-teal-200 bg-teal-50/30"}`}
            >
              <p className="text-base text-zinc-800">{n.message}</p>
              <p className="mt-2 text-sm text-zinc-500">
                {new Date(n.createdAt).toLocaleString("es-MX")}
              </p>
              {n.orderId && (
                <Link
                  href={`/ordenes/${n.orderId}`}
                  className="mt-3 inline-block text-base font-semibold text-orange-700 underline"
                >
                  Ver orden
                </Link>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
