import type { CompanyCardKind, CompanyCardMovementKind } from "@/lib/domain/types";
import {
  asDestination,
  asExpenseStatus,
  asMovementKind,
  asReceiptKind,
  CARD_CATEGORIES,
  parseOccurredOn,
  parsePositiveMoney,
} from "@/lib/tarjetas/summary";

export type ParsedMovement = {
  kind: CompanyCardMovementKind;
  occurredOn: Date;
  amount: number;
  supplierName: string;
  concept: string;
  category: string;
  destinationKind: string;
  obraId: string | null;
  costCenter: string;
  responsibleUserId: string | null;
  responsibleEmployeeId: string | null;
  receiptKind: string;
  missingReceiptReason: string;
  status: string;
};

function text(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseMovementForm(form: FormData, cardKind: CompanyCardKind): { data: ParsedMovement } | { error: string } {
  const kind = asMovementKind(text(form.get("kind"), 20));
  const occurredOn = parseOccurredOn(form.get("occurredOn"));
  const amount = parsePositiveMoney(form.get("amount"));
  if (!kind || !occurredOn || amount == null) {
    return { error: "Fecha, tipo y monto son obligatorios." };
  }
  if (kind === "carga") {
    if (cardKind !== "debito") return { error: "La carga de saldo solo aplica a las BanBajío de débito." };
    return {
      data: {
        kind,
        occurredOn,
        amount,
        supplierName: "",
        concept: text(form.get("concept"), 160) || "Carga de saldo",
        category: "",
        destinationKind: "",
        obraId: null,
        costCenter: "",
        responsibleUserId: null,
        responsibleEmployeeId: null,
        receiptKind: "",
        missingReceiptReason: "",
        status: "carga",
      },
    };
  }

  const supplierName = text(form.get("supplierName"), 160);
  const concept = text(form.get("concept"), 160);
  const category = text(form.get("category"), 40);
  const destinationKind = asDestination(text(form.get("destinationKind"), 20));
  const obraId = text(form.get("obraId"), 40) || null;
  const costCenter = text(form.get("costCenter"), 120);
  const responsibleKind = text(form.get("responsibleKind"), 20);
  const responsibleId = text(form.get("responsibleId"), 40);
  const receiptKind = asReceiptKind(text(form.get("receiptKind"), 30));
  const missingReceiptReason = text(form.get("missingReceiptReason"), 500);
  const status = asExpenseStatus(text(form.get("status"), 20));

  if (!supplierName || !concept || !(CARD_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Proveedor, concepto y categoría son obligatorios." };
  }
  if (!destinationKind) return { error: "Indica el destino del gasto." };
  if (destinationKind === "obra" && !obraId) return { error: "Elige la obra." };
  if (destinationKind === "otro" && !costCenter) return { error: "Escribe el centro de costo." };
  if (!responsibleId || (responsibleKind !== "user" && responsibleKind !== "employee")) {
    return { error: "Elige al responsable." };
  }
  if (!receiptKind) return { error: "Elige el tipo de comprobante." };
  if (receiptKind === "sin_comprobante" && !missingReceiptReason) {
    return { error: "Sin comprobante hay que escribir una observación." };
  }
  if (!status) return { error: "Elige el estatus del gasto." };

  return {
    data: {
      kind,
      occurredOn,
      amount,
      supplierName,
      concept,
      category,
      destinationKind,
      obraId: destinationKind === "obra" ? obraId : null,
      costCenter: destinationKind === "otro" ? costCenter : "",
      responsibleUserId: responsibleKind === "user" ? responsibleId : null,
      responsibleEmployeeId: responsibleKind === "employee" ? responsibleId : null,
      receiptKind,
      missingReceiptReason: receiptKind === "sin_comprobante" ? missingReceiptReason : "",
      status,
    },
  };
}
