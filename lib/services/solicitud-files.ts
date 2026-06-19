import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { useDatabaseFileStorage } from "@/lib/services/file-storage-mode";
import { isPdf } from "@/lib/services/files";

const MAX_BYTES = 15 * 1024 * 1024;

function filesRoot(): string {
  const env = process.env.FILES_ROOT;
  if (env) return env;
  return path.join(process.cwd(), "storage", "files");
}

async function ensureRoot(): Promise<string> {
  const root = filesRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

export async function saveSolicitudAttachment(input: {
  materialRequestId?: string;
  directExpenseId?: string;
  file: File;
  uploadedByUserId: string;
}): Promise<{ id: string; originalFileName: string }> {
  if (!input.materialRequestId && !input.directExpenseId) {
    throw new Error("Solicitud no especificada.");
  }
  if (!isPdf(input.file)) throw new Error("Solo se permiten archivos PDF.");
  if (input.file.size > MAX_BYTES) throw new Error("El archivo supera el límite de 15 MB.");

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const folder = input.materialRequestId
    ? `material-${input.materialRequestId}`
    : `expense-${input.directExpenseId}`;

  if (useDatabaseFileStorage()) {
    const record = await prisma.solicitudAttachment.create({
      data: {
        materialRequestId: input.materialRequestId ?? null,
        directExpenseId: input.directExpenseId ?? null,
        originalFileName: input.file.name,
        storagePath: "database",
        fileData: buffer,
        mimeType: input.file.type || "application/pdf",
        sizeBytes: input.file.size,
        uploadedByUserId: input.uploadedByUserId,
      },
    });
    return { id: record.id, originalFileName: record.originalFileName };
  }

  const root = await ensureRoot();
  const dir = path.join(root, "solicitudes", folder);
  await fs.mkdir(dir, { recursive: true });
  const storedName = `att_${Date.now()}.pdf`;
  const abs = path.join(dir, storedName);
  await fs.writeFile(abs, buffer);
  const relativePath = path.join("solicitudes", folder, storedName).replace(/\\/g, "/");

  const record = await prisma.solicitudAttachment.create({
    data: {
      materialRequestId: input.materialRequestId ?? null,
      directExpenseId: input.directExpenseId ?? null,
      originalFileName: input.file.name,
      storagePath: relativePath,
      mimeType: input.file.type || "application/pdf",
      sizeBytes: input.file.size,
      uploadedByUserId: input.uploadedByUserId,
    },
  });
  return { id: record.id, originalFileName: record.originalFileName };
}

export async function saveDirectExpenseFile(input: {
  expenseId: string;
  kind: "comprobante_pago" | "factura";
  file: File;
  uploadedByUserId: string;
}): Promise<{ id: string }> {
  if (!isPdf(input.file)) throw new Error("Solo se permiten archivos PDF.");
  if (input.file.size > MAX_BYTES) throw new Error("El archivo supera el límite de 15 MB.");

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const folder = `expense-${input.expenseId}`;

  if (useDatabaseFileStorage()) {
    const record = await prisma.directExpenseFile.create({
      data: {
        expenseId: input.expenseId,
        kind: input.kind,
        originalFileName: input.file.name,
        storagePath: "database",
        fileData: buffer,
        mimeType: input.file.type || "application/pdf",
        sizeBytes: input.file.size,
        uploadedByUserId: input.uploadedByUserId,
      },
    });
    return { id: record.id };
  }

  const root = await ensureRoot();
  const dir = path.join(root, "solicitudes", folder);
  await fs.mkdir(dir, { recursive: true });
  const storedName = `${input.kind}_${Date.now()}.pdf`;
  const abs = path.join(dir, storedName);
  await fs.writeFile(abs, buffer);
  const relativePath = path.join("solicitudes", folder, storedName).replace(/\\/g, "/");

  const record = await prisma.directExpenseFile.create({
    data: {
      expenseId: input.expenseId,
      kind: input.kind,
      originalFileName: input.file.name,
      storagePath: relativePath,
      mimeType: input.file.type || "application/pdf",
      sizeBytes: input.file.size,
      uploadedByUserId: input.uploadedByUserId,
    },
  });
  return { id: record.id };
}

export async function readSolicitudAttachmentBuffer(fileId: string) {
  const file = await prisma.solicitudAttachment.findUnique({ where: { id: fileId } });
  if (!file) return null;
  if (file.fileData && file.fileData.length > 0) {
    return { buffer: Buffer.from(file.fileData), mimeType: file.mimeType, originalFileName: file.originalFileName };
  }
  const abs = path.join(filesRoot(), file.storagePath);
  try {
    const buffer = await fs.readFile(abs);
    return { buffer, mimeType: file.mimeType, originalFileName: file.originalFileName };
  } catch {
    return null;
  }
}

export async function readDirectExpenseFileBuffer(fileId: string) {
  const file = await prisma.directExpenseFile.findUnique({ where: { id: fileId } });
  if (!file) return null;
  if (file.fileData && file.fileData.length > 0) {
    return { buffer: Buffer.from(file.fileData), mimeType: file.mimeType, originalFileName: file.originalFileName };
  }
  const abs = path.join(filesRoot(), file.storagePath);
  try {
    const buffer = await fs.readFile(abs);
    return { buffer, mimeType: file.mimeType, originalFileName: file.originalFileName };
  } catch {
    return null;
  }
}
