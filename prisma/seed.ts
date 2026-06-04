import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const INITIAL_PASSWORD = process.env.INITIAL_PASSWORD ?? "ccp2026";

const USERS = [
  { email: "carolina@ccp.local", name: "Rosa Carolina", role: "pagos" },
  { email: "paty@ccp.local", name: "Paty", role: "compras" },
  { email: "santiago@ccp.local", name: "Santiago", role: "ingeniero" },
  { email: "recepcion@ccp.local", name: "Recepción", role: "recepcion" },
  { email: "helena@ccp.local", name: "Helena", role: "contabilidad" },
] as const;

async function main() {
  const passwordHash = await hashPassword(INITIAL_PASSWORD);

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });
  }

  const paty = await prisma.user.findUnique({ where: { email: "paty@ccp.local" } });
  if (!paty) throw new Error("Usuario Paty no creado");

  const obraCount = await prisma.obra.count();
  if (obraCount === 0) {
    const obra1 = await prisma.obra.create({
      data: { name: "Subestación Norte", active: true },
    });
    const obra2 = await prisma.obra.create({
      data: { name: "Obra Centro — Edificio A", active: true },
    });

    await prisma.purchaseOrder.create({
      data: {
        obraId: obra1.id,
        title: "Cable THWN lote 1",
        supplierName: "Electro Mayorista SA",
        totalAmount: 85000,
        amountPaidSoFar: 0,
        paymentLabel: "pendiente",
        suggestedPaymentType: "parcialidades",
        status: "awaitingEngineer",
        description: "Material para canalización principal",
        createdByUserId: paty.id,
      },
    });

    await prisma.purchaseOrder.create({
      data: {
        obraId: obra2.id,
        title: "Terminales de compresión",
        supplierName: "Conecta Industrial",
        totalAmount: 22000,
        amountPaidSoFar: 0,
        paymentLabel: "pendiente",
        paymentType: "inmediato",
        status: "awaitingPayment",
        description: "Terminales varias medidas",
        createdByUserId: paty.id,
      },
    });
  }

  console.log("Seed OK. Contraseña inicial:", INITIAL_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
