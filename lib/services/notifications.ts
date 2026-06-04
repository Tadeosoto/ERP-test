import { prisma } from "@/lib/db";
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
    message: `Paty registró la orden «${orderTitle}». Santiago: revisa y aprueba.`,
    roles: ["ingeniero"] as Role[],
  }),
  ocPdfUpdated: (orderTitle: string) => ({
    type: "oc_pdf_updated",
    message: `Paty actualizó el PDF de «${orderTitle}». Santiago: vuelve a revisar.`,
    roles: ["ingeniero"] as Role[],
  }),
  engineerApproved: (orderTitle: string) => ({
    type: "engineer_approved",
    message: `Santiago aprobó «${orderTitle}». Carolina: revisa el pago pendiente.`,
    roles: ["pagos", "compras"] as Role[],
  }),
  engineerApprovedProgramado: (orderTitle: string) => ({
    type: "engineer_approved_programado",
    message: `Santiago aprobó «${orderTitle}» como pago programado. Paty: indica la fecha límite.`,
    roles: ["compras"] as Role[],
  }),
  engineerRejected: (orderTitle: string) => ({
    type: "engineer_rejected",
    message: `Santiago solicitó correcciones en «${orderTitle}».`,
    roles: ["compras"] as Role[],
  }),
  deadlineSet: (orderTitle: string, dateStr: string) => ({
    type: "deadline_set",
    message: `Paty fijó fecha límite de pago (${dateStr}) para «${orderTitle}». Carolina: programa el pago.`,
    roles: ["pagos"] as Role[],
  }),
  paymentRegistered: (orderTitle: string, fullyPaid: boolean) => ({
    type: "payment_registered",
    message: fullyPaid
      ? `Carolina saldó «${orderTitle}». Paty: sube factura y documentos.`
      : `Carolina registró un abono en «${orderTitle}».`,
    roles: fullyPaid ? (["compras", "ingeniero"] as Role[]) : (["compras"] as Role[]),
  }),
  finalDocsUploaded: (orderTitle: string) => ({
    type: "final_docs_uploaded",
    message: `Paty subió documentos finales de «${orderTitle}». Ya pueden consultarlos.`,
    roles: ["pagos", "compras", "ingeniero", "recepcion", "contabilidad"] as Role[],
  }),
};
