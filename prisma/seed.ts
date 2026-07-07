import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const INITIAL_PASSWORD = process.env.INITIAL_PASSWORD ?? "ccp2026";

const USERS = [
  { email: "carolina@ccp.local", name: "Rosa Carolina", role: "pagos" },
  { email: "paty@ccp.local", name: "Paty", role: "compras" },
  { email: "santiago@ccp.local", name: "Santiago", role: "ingeniero" },
  { email: "recepcion@ccp.local", name: "Recepción", role: "recepcion" },
  { email: "helena@ccp.local", name: "Elena", role: "contabilidad" },
  { email: "diomedes@ccp.local", name: "Ing. Diomedes", role: "direccion" },
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
  const santiago = await prisma.user.findUnique({ where: { email: "santiago@ccp.local" } });
  if (!paty) throw new Error("Usuario Paty no creado");

  const supplierCount = await prisma.supplier.count();
  if (supplierCount === 0) {
    await prisma.supplier.createMany({
      data: [
        {
          legalName: "Inalum S.A. de C.V.",
          rfc: "INA123456B12",
          commercialName: "Inalum",
          city: "Ciudad de México",
          state: "Ciudad de México",
        },
        {
          legalName: "Electro Mayorista SA de CV",
          rfc: "EMA987654X01",
          commercialName: "Electro Mayorista",
          city: "Monterrey",
          state: "Nuevo León",
        },
      ],
    });
  }

  const obraCount = await prisma.obra.count();
  if (obraCount === 0) {
    const obra1 = await prisma.obra.create({
      data: {
        name: "Torre Residencial Aurora",
        code: "OBR-2026-001",
        client: "Desarrollos del Norte SA",
        managerName: "Ing. Roberto Vega",
        startDate: new Date("2026-01-15"),
        estimatedEndDate: new Date("2027-06-30"),
        active: true,
      },
    });
    const obra2 = await prisma.obra.create({
      data: {
        name: "14023 - San Martín",
        code: "OBR-2026-002",
        client: "Consorcio Interno",
        managerName: "Ing. Santiago Mendoza",
        startDate: new Date("2026-03-01"),
        estimatedEndDate: new Date("2026-12-15"),
        active: true,
      },
    });

    await prisma.purchaseOrder.create({
      data: {
        obraId: obra1.id,
        title: "Cable THWN lote 1",
        supplierName: "Electro Mayorista SA",
        totalAmount: 85000,
        amountPaidSoFar: 0,
        paymentLabel: "pendiente",
        paymentType: "parcialidades",
        suggestedPaymentType: "parcialidades",
        status: "awaitingEngineer",
        description: "Material para canalización principal",
        assignedEngineerUserId: santiago?.id ?? null,
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

    await prisma.purchaseOrder.create({
      data: {
        obraId: obra1.id,
        title: "Transformador 45 kVA",
        supplierName: "Energía Total",
        totalAmount: 156000,
        amountPaidSoFar: 156000,
        paymentLabel: "saldada",
        paymentType: "inmediato",
        status: "paid",
        description: "Equipo principal subestación",
        createdByUserId: paty.id,
      },
    });

    await prisma.purchaseOrder.create({
      data: {
        obraId: obra2.id,
        title: "Material de acabados",
        supplierName: "Proveedora Centro",
        totalAmount: 48000,
        amountPaidSoFar: 48000,
        paymentLabel: "saldada",
        paymentType: "programado",
        status: "invoiceReceived",
        description: "Acabados edificio A",
        createdByUserId: paty.id,
      },
    });

    if (santiago) {
      await prisma.materialRequest.create({
        data: {
          obraId: obra2.id,
          costCenter: "CC-14023-ELEC",
          materials: "Tubería PVC cédula 40, codos y coples",
          quantities: "120 m tubería, 48 codos 90°",
          justification: "Canalización secundaria edificio B",
          status: "sent",
          sentAt: new Date(),
          createdByUserId: santiago.id,
        },
      });
    }
  }

  const carolina = await prisma.user.findUnique({ where: { email: "carolina@ccp.local" } });
  const commitmentCount = await prisma.recurringCommitment.count();
  if (commitmentCount === 0 && carolina) {
    const y = 2026;
    await prisma.recurringCommitment.createMany({
      data: [
        {
          supplierName: "AT&T",
          concept: "Planes celulares",
          frequency: "mensual",
          expectedReceptionDay: 5,
          nextReceptionDate: new Date(y, 6, 5, 12, 0, 0),
          dueDate: new Date(y, 6, 20, 12, 0, 0),
          workflowStatus: "awaiting_invoice",
          createdByUserId: carolina.id,
        },
        {
          supplierName: "Microsoft 365",
          concept: "Licencias",
          frequency: "mensual",
          expectedReceptionDay: 7,
          nextReceptionDate: new Date(y, 6, 7, 12, 0, 0),
          dueDate: new Date(y, 6, 22, 12, 0, 0),
          workflowStatus: "awaiting_invoice",
          createdByUserId: carolina.id,
        },
        {
          supplierName: "CFE",
          concept: "Energía eléctrica",
          frequency: "bimestral",
          expectedReceptionDay: 10,
          nextReceptionDate: new Date(y, 6, 10, 12, 0, 0),
          dueDate: new Date(y, 6, 30, 12, 0, 0),
          workflowStatus: "pending",
          createdByUserId: carolina.id,
        },
        {
          supplierName: "Telmex",
          concept: "Internet empresarial",
          frequency: "mensual",
          expectedReceptionDay: 12,
          nextReceptionDate: new Date(y, 6, 12, 12, 0, 0),
          dueDate: new Date(y, 6, 27, 12, 0, 0),
          workflowStatus: "awaiting_invoice",
          createdByUserId: carolina.id,
        },
        {
          supplierName: "Renta oficina GDL",
          concept: "Renta",
          frequency: "mensual",
          expectedReceptionDay: 15,
          nextReceptionDate: new Date(y, 6, 15, 12, 0, 0),
          dueDate: new Date(y, 6, 30, 12, 0, 0),
          workflowStatus: "awaiting_invoice",
          createdByUserId: carolina.id,
        },
      ],
    });
  }

  const diomedes = await prisma.user.findUnique({ where: { email: "diomedes@ccp.local" } });
  const invoiceFirstCount = await prisma.invoiceFirstCommitment.count();
  if (invoiceFirstCount === 0 && diomedes) {
    const obras = await prisma.obra.findMany({ take: 2 });
    const obra1 = obras[0];
    const obra2 = obras[1] ?? obras[0];
    await prisma.invoiceFirstCommitment.createMany({
      data: [
        {
          invoiceFolio: "FAC-4587",
          supplierName: "Aceros del Norte",
          obraId: obra1?.id ?? null,
          totalAmount: 350000,
          currency: "MXN",
          invoiceDate: new Date("2026-06-01"),
          comment: "Material estructural — cimentaciones",
          status: "awaiting_oc",
          createdByUserId: diomedes.id,
        },
        {
          invoiceFolio: "FAC-8123",
          supplierName: "CFE",
          obraId: obra2?.id ?? null,
          totalAmount: 18500,
          currency: "MXN",
          invoiceDate: new Date("2026-06-10"),
          status: "oc_requested",
          ocRequestedAt: new Date(),
          createdByUserId: diomedes.id,
        },
        {
          invoiceFolio: "FAC-9012",
          supplierName: "Tecnología Industrial SA",
          obraId: obra1?.id ?? null,
          totalAmount: 42350,
          currency: "MXN",
          invoiceDate: new Date("2026-05-20"),
          status: "awaiting_oc",
          createdByUserId: diomedes.id,
        },
      ],
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
