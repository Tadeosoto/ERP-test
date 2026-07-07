import { prisma } from "@/lib/db";

export async function nextInvoiceFolio(): Promise<string> {
  const count = await prisma.invoiceFirstCommitment.count();
  return `FAC-${4580 + count + 1}`;
}
