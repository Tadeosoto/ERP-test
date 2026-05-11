"use client";

/** Calendario decorativo simplificado (sin librerías). */
export function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const label = now.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weekDays = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize text-zinc-900">{label}</h3>
        <span className="text-xs font-medium text-orange-600">demo</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
        {weekDays.map((w) => (
          <div key={w} className="py-1 font-medium">
            {w}
          </div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`flex min-h-[2rem] items-center justify-center rounded-xl text-sm ${
              d === null
                ? ""
                : d === today
                  ? "bg-orange-600 font-semibold text-white"
                  : [5, 12, 19].includes(d)
                    ? "bg-orange-50 font-medium text-orange-900"
                    : "text-zinc-700"
            }`}
          >
            {d ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}
