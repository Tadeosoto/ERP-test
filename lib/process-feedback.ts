export const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  engineer_approve: "OC aprobada con firma. Pasa a autorización de Admin o Dirección.",
  engineer_reject: "Se solicitó la corrección. Compras fue notificada.",
  authorize_order: "OC autorizada. Quedó lista para pagar.",
  set_payment_deadline: "Fecha límite guardada. Pasa a autorización.",
  register_payment: "El pago se registró correctamente.",
  mark_awaiting_invoice: "La orden quedó en espera de factura.",
  accounting_complete: "La orden fue validada y cerrada.",
  accounting_flag_difference: "La diferencia quedó registrada.",
  accounting_resolve: "La diferencia se resolvió y la orden cerró.",
};

export const FILE_UPLOAD_SUCCESS_MESSAGES: Record<string, string> = {
  oc_pdf: "El PDF de la orden se subió correctamente.",
  oc_signed_pdf: "El PDF firmado se subió correctamente.",
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
