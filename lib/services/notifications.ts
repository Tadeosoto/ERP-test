import { prisma } from "@/lib/db";
import { INVOICE_UPLOAD_ROLES } from "@/lib/domain/flow";
import type { Role } from "@/lib/domain/types";

type NotifyInput = {
  orderId: string;
  type: string;
  message: string;
  userIds: string[];
};

export async function notifyUsers(input: NotifyInput): Promise<void> {
  if (input.userIds.length === 0) return;
  await prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      orderId: input.orderId,
      type: input.type,
      message: input.message,
    })),
  });
}

export async function notifyByRoles(
  orderId: string,
  type: string,
  message: string,
  roles: Role[]
): Promise<void> {
  const users = await prisma.user.findMany({ where: { role: { in: roles } } });
  await notifyUsers({
    orderId,
    type,
    message,
    userIds: users.map((u) => u.id),
  });
}

export async function notifyAllUsers(orderId: string, type: string, message: string): Promise<void> {
  const users = await prisma.user.findMany();
  await notifyUsers({
    orderId,
    type,
    message,
    userIds: users.map((u) => u.id),
  });
}

export const NotificationEvents = {
  orderCreated: (orderTitle: string) => ({
    type: "order_created",
    message: `Paty registró la orden «${orderTitle}». Ingeniería: revisa y aprueba.`,
    roles: ["ingeniero"] as Role[],
  }),
  ocPdfUpdated: (orderTitle: string) => ({
    type: "oc_pdf_updated",
    message: `Paty actualizó el PDF de «${orderTitle}». Ingeniería: vuelve a revisar.`,
    roles: ["ingeniero"] as Role[],
  }),
  engineerApproved: (orderTitle: string) => ({
    type: "engineer_approved",
    message: `Ingeniería aprobó «${orderTitle}». Administración: registra el pago.`,
    roles: ["pagos"] as Role[],
  }),
  engineerApprovedProgramado: (orderTitle: string) => ({
    type: "engineer_approved_programado",
    message: `Ingeniería aprobó «${orderTitle}» como pago programado. Paty: indica la fecha límite.`,
    roles: ["compras"] as Role[],
  }),
  engineerRejected: (orderTitle: string) => ({
    type: "engineer_rejected",
    message: `Ingeniería solicitó correcciones en «${orderTitle}».`,
    roles: ["compras"] as Role[],
  }),
  deadlineSet: (orderTitle: string, dateStr: string) => ({
    type: "deadline_set",
    message: `Paty fijó fecha límite de pago (${dateStr}) para «${orderTitle}». Administración: programa el pago.`,
    roles: ["pagos"] as Role[],
  }),
  paymentRegistered: (orderTitle: string, fullyPaid: boolean) => ({
    type: "payment_registered",
    message: fullyPaid
      ? `Administración registró el pago de «${orderTitle}». Compras: coordina con el proveedor.`
      : `Administración registró un abono en «${orderTitle}».`,
    roles: fullyPaid ? (["compras"] as Role[]) : (["pagos"] as Role[]),
  }),
  awaitingInvoice: (orderTitle: string) => ({
    type: "awaiting_invoice",
    message: `«${orderTitle}» espera factura. Compras, Administración o Recepción pueden subirla.`,
    roles: INVOICE_UPLOAD_ROLES,
  }),
  invoiceUploaded: (orderTitle: string) => ({
    type: "invoice_uploaded",
    message: `Factura recibida en «${orderTitle}». Contabilidad: valida el expediente.`,
    roles: ["contabilidad"] as Role[],
  }),
  orderCompleted: (orderTitle: string) => ({
    type: "order_completed",
    message: `«${orderTitle}» completada. Expediente cerrado.`,
    roles: ["pagos", "compras", "ingeniero", "recepcion", "contabilidad"] as Role[],
  }),
  orderDifference: (orderTitle: string) => ({
    type: "order_difference",
    message: `Diferencia detectada en «${orderTitle}». Contabilidad debe revisar.`,
    roles: ["contabilidad", "compras", "pagos"] as Role[],
  }),
};
