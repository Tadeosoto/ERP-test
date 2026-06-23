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
      "Santiago inicia los procesos de compra (A y B), administra obras y aprueba las OC que registra Compras antes de que sigan a pago.",
    sections: [
      {
        heading: "Proceso A — Solicitud de material",
        steps: [
          "Ve a Solicitudes → Nueva solicitud de material y elige la obra.",
          "Describe materiales, cantidades y justificación; adjunta archivos si aplica.",
          "Envía la solicitud a Compras. Paty la verá en su bandeja para crear la OC.",
        ],
      },
      {
        heading: "Proceso B — Gasto directo sin OC",
        steps: [
          "Crea un gasto directo desde Solicitudes cuando no requiera orden de compra.",
          "Completa categoría, monto y comprobantes; envía para que Administración pague.",
        ],
      },
      {
        heading: "Obras",
        steps: [
          "En Obras puedes crear y editar proyectos del consorcio.",
          "Todos los roles consultan las obras y sus OC; solo tú creas obras nuevas.",
        ],
      },
      {
        heading: "Aprobar órdenes de compra",
        steps: [
          "En Inicio revisa «Órdenes pendientes de mi aprobación».",
          "Abre la OC (texto azul), descarga el PDF y verifica monto, proveedor y obra.",
          "Aprueba para liberar el pago o solicita corrección; Compras actualizará el PDF.",
        ],
      },
    ],
  },
  compras: {
    role: "compras",
    title: "Guía rápida — Compras",
    intro:
      "Paty recibe solicitudes de Ingeniería, negocia con proveedores, registra la OC en CONTPAQi y coordina el cierre documental.",
    sections: [
      {
        heading: "Crear y editar OC",
        steps: [
          "Desde Inicio u Obras, pulsa «Nueva OC» y elige obra y proveedor.",
          "Define modalidad de pago: inmediato, a 30 días o parcialidades.",
          "Sube el PDF de CONTPAQi y envía a Ingeniería para aprobación.",
          "Solo Compras puede editar, eliminar o reemplazar el PDF en borrador o corrección.",
        ],
      },
      {
        heading: "Solicitudes de material",
        steps: [
          "Revisa la bandeja de solicitudes enviadas por Ingeniería.",
          "Cotiza con proveedores y convierte la solicitud en OC con datos precargados.",
        ],
      },
      {
        heading: "Después del pago",
        steps: [
          "Cuando Administración registra el pago, envía el comprobante al proveedor.",
          "Marca «Esperando factura» y sube el PDF cuando llegue (tú, Recepción o Administración).",
        ],
      },
    ],
  },
  pagos: {
    role: "pagos",
    title: "Guía rápida — Administración de pagos",
    intro:
      "Carolina ejecuta los pagos autorizados, registra montos y sube comprobantes bancarios.",
    sections: [
      {
        heading: "Registrar pagos",
        steps: [
          "En Inicio abre la OC de tu bandeja (enlace azul).",
          "En «Tu tarea» indica monto, referencia bancaria y notas.",
          "Sube el PDF del comprobante de pago.",
        ],
      },
      {
        heading: "Modalidades",
        steps: [
          "Pago inmediato: liquida el 100% de una vez.",
          "Programado: respeta la fecha límite que fijó Compras.",
          "Parcialidades: registra abonos hasta completar el total.",
        ],
      },
      {
        heading: "Facturas",
        steps: [
          "También puedes subir la factura del proveedor si llega antes que Compras o Recepción.",
        ],
      },
    ],
  },
  recepcion: {
    role: "recepcion",
    title: "Guía rápida — Recepción",
    intro: "Recepción apoya la carga documental cuando llegan facturas y consulta el avance de las compras.",
    sections: [
      {
        heading: "Subir facturas",
        steps: [
          "Abre la OC desde Obras o Inicio cuando esté en «Esperando factura».",
          "En «Tu tarea» sube el PDF de la factura del proveedor.",
        ],
      },
      {
        heading: "Consulta",
        steps: [
          "Puedes ver todas las obras, OC y expedientes completos.",
          "Usa el menú de acciones para consultar pagos, comprobantes y bitácora.",
        ],
      },
    ],
  },
  contabilidad: {
    role: "contabilidad",
    title: "Guía rápida — Contabilidad",
    intro: "Helena valida que OC, pago y factura coinciden antes de cerrar el expediente.",
    sections: [
      {
        heading: "Validación",
        steps: [
          "Abre OC en estado «Factura recibida» desde tu bandeja.",
          "Compara montos del PDF de OC, comprobante(s) de pago y factura.",
          "Aprueba si cuadra o marca diferencia con comentario para el equipo.",
        ],
      },
      {
        heading: "Cierre",
        steps: [
          "Al validar, el expediente queda completado y disponible para consulta de todos.",
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
