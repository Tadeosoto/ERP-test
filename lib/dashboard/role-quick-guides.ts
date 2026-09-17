import type { Role } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/domain/labels";

export type RoleGuideSection = {
  heading: string;
  steps: string[];
};

export type RoleQuickGuide = {
  role: Role;
  title: string;
  intro: string;
  sections: RoleGuideSection[];
};

export const ROLE_QUICK_GUIDES: Record<Role, RoleQuickGuide> = {
  ingeniero: {
    role: "ingeniero",
    title: "Guía rápida — Ingeniería",
    intro:
      "Creas obras (con equipo), pides materiales a Compras y apruebas la OC con PDF firmado antes de la autorización y el pago.",
    sections: [
      {
        heading: "Obra y equipo",
        steps: [
          "En Obras crea el proyecto y designa los ingenieros involucrados.",
          "Solo ves y actúas en obras donde estás designado o que tú creaste.",
        ],
      },
      {
        heading: "Solicitud de material",
        steps: [
          "Desde Inicio o Solicitudes indica qué material y qué cantidad necesitas.",
          "Envía a Compras; Paty elige proveedor y arma la OC.",
        ],
      },
      {
        heading: "Aprobar la OC",
        steps: [
          "En Inicio → Por revisar abre la OC, descarga el PDF y verifica datos.",
          "Aprueba (botón + PDF firmado) o pide corrección a Compras.",
        ],
      },
    ],
  },
  compras: {
    role: "compras",
    title: "Guía rápida — Compras",
    intro:
      "Recibes solicitudes de material, armas la OC con proveedor y plazos, y tras el pago coordinas factura con el proveedor.",
    sections: [
      {
        heading: "Armar la OC",
        steps: [
          "Revisa Solicitudes Ingeniería: material + cantidad.",
          "Elige proveedor según disponibilidad, define plazos, sube el PDF y envía a Ingeniería.",
        ],
      },
      {
        heading: "Correcciones",
        steps: [
          "Si Ingeniería rechaza, actualiza la OC y vuelve a enviarla a revisión.",
        ],
      },
      {
        heading: "Tras el pago",
        steps: [
          "Envía el comprobante al proveedor y registra la factura cuando llegue.",
        ],
      },
    ],
  },
  pagos: {
    role: "pagos",
    title: "Guía rápida — Administración",
    intro:
      "Autorizas OC (tú o Dirección), registras pagos con comprobante hasta saldar, y llevas compromisos aparte.",
    sections: [
      {
        heading: "Autorizar y pagar",
        steps: [
          "Tras la firma de Ingeniería, tú o Diomedes dan el sí (basta uno).",
          "La OC queda lista para pagar: registra monto y sube el comprobante PDF.",
          "Con plazos, sube más comprobantes hasta completar el total.",
        ],
      },
      {
        heading: "Obras",
        steps: [
          "Puedes crear obras y designar el equipo de ingenieros.",
        ],
      },
      {
        heading: "Compromisos",
        steps: [
          "Los compromisos recurrentes son un proceso aparte de servicios; no son el Proceso A.",
        ],
      },
    ],
  },
  recepcion: {
    role: "recepcion",
    title: "Guía rápida — Recepción",
    intro: "Apoyas la carga documental cuando llegan facturas y consultas el avance de las compras.",
    sections: [
      {
        heading: "Facturas",
        steps: [
          "Abre la OC cuando esté saldada / esperando factura y sube el PDF.",
        ],
      },
      {
        heading: "Consulta",
        steps: [
          "Puedes ver obras, expedientes y documentos de pago.",
        ],
      },
    ],
  },
  contabilidad: {
    role: "contabilidad",
    title: "Guía rápida — Contabilidad",
    intro: "Consultas OC, pagos y facturas por obra y apoyas si hay diferencias documentales.",
    sections: [
      {
        heading: "Documentos",
        steps: [
          "Revisa montos de OC, comprobantes y factura.",
          "Marca diferencia si algo no cuadra.",
        ],
      },
    ],
  },
  direccion: {
    role: "direccion",
    title: "Guía rápida — Dirección",
    intro:
      "Autorizas OC junto con Administración (un sí basta) y das seguimiento a pagos y saldos por obra.",
    sections: [
      {
        heading: "Autorizar",
        steps: [
          "En Inicio → Por autorizar revisa la OC aprobada por Ingeniería.",
          "Si das el sí, avanza a listo para pagar (Carolina ejecuta el pago).",
        ],
      },
      {
        heading: "Consulta",
        steps: [
          "Usa Pagos, Expedientes y Reportes para ver el estado del consorcio.",
        ],
      },
    ],
  },
};

export function getRoleQuickGuide(role: Role): RoleQuickGuide {
  return ROLE_QUICK_GUIDES[role];
}

export function roleGuideLabel(role: Role): string {
  return ROLE_LABEL[role];
}
