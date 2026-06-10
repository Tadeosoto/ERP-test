/** Fondos y bordes suaves por panel del inicio (poca saturación). */
export const PANEL_SURFACE = {
  bandeja: "border-orange-100/90 bg-orange-50/75",
  obras: "border-teal-100/80 bg-teal-50/45",
  ordenes: "border-violet-100/75 bg-violet-50/40",
  movimientos: "border-sky-100/80 bg-sky-50/50",
  pendientes: "border-amber-100/80 bg-amber-50/55",
  flujo: "border-teal-100/80 bg-teal-50/35",
  obrasNav: "border-orange-100/90 bg-orange-50/45",
  accion: "border-violet-100/75 bg-violet-50/35",
} as const;

export type PanelSurfaceKey = keyof typeof PANEL_SURFACE;

export const PANEL_HOVER_ROW: Partial<Record<PanelSurfaceKey, string>> = {
  bandeja: "hover:border-orange-200/80 hover:bg-orange-100/35",
  obras: "hover:border-teal-200/70 hover:bg-teal-100/30",
  ordenes: "hover:border-violet-200/70 hover:bg-violet-100/25",
  movimientos: "hover:border-sky-200/70 hover:bg-sky-100/30",
  pendientes: "hover:border-amber-200/70 hover:bg-amber-100/35",
};
