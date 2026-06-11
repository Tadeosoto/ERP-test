export const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  engineer_approve: "La orden fue aprobada y avanzó en el proceso.",
  engineer_reject: "Se solicitó la corrección. Compras fue notificada.",
  set_payment_deadline: "La fecha límite se guardó y Carolina fue avisada.",
  register_payment: "El pago se registró correctamente.",
  mark_awaiting_invoice: "La orden quedó en espera de factura.",
  accounting_complete: "El expediente fue validado y cerrado.",
  accounting_flag_difference: "La diferencia quedó registrada.",
  accounting_resolve: "La diferencia se resolvió y el expediente cerró.",
};

export const FILE_UPLOAD_SUCCESS_MESSAGES: Record<string, string> = {
  oc_pdf: "El PDF de la orden se subió correctamente.",
  comprobante_pago: "El comprobante de pago se subió correctamente.",
  factura: "La factura se subió correctamente.",
  complemento_pago: "El complemento de pago se subió correctamente.",
};

export function actionSuccessMessage(action: string): string {
  return ACTION_SUCCESS_MESSAGES[action] ?? "La tarea se completó correctamente.";
}

export function fileUploadSuccessMessage(kind: string): string {
  return FILE_UPLOAD_SUCCESS_MESSAGES[kind] ?? "El archivo se subió correctamente.";
}
