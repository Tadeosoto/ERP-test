import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { useDatabaseFileStorage } from "@/lib/services/file-storage-mode";
import { isPdf, removeStoredFileFromDisk } from "@/lib/services/files";

const MAX_BYTES = 15 * 1024 * 1024;

function filesRoot(): string {
  const env = process.env.FILES_ROOT;
  if (env) return env;
  return path.join(process.cwd(), "storage", "files");
}

export async function saveRecurringCommitmentFile(input: {
  commitmentId: string;
  kind: "factura" | "comprobante_pago";
  file: File;
  uploadedByUserId: string;
}): Promise<{ id: string }> {
  if (!isPdf(input.file)) throw new Error("Solo se permiten archivos PDF.");
  if (input.file.size > MAX_BYTES) throw new Error("El archivo supera el límite de 15 MB.");

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const folder = `recurring-${input.commitmentId}`;

  if (useDatabaseFileStorage()) {
    const record = await prisma.recurringCommitmentFile.create({
      data: {
        commitmentId: input.commitmentId,
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

  const root = filesRoot();
  const dir = path.join(root, "recurring", folder);
  await fs.mkdir(dir, { recursive: true });
  const storedName = `${input.kind}_${Date.now()}.pdf`;
  const abs = path.join(dir, storedName);
  await fs.writeFile(abs, buffer);
  const relativePath = path.join("recurring", folder, storedName).replace(/\\/g, "/");

  const record = await prisma.recurringCommitmentFile.create({
    data: {
      commitmentId: input.commitmentId,
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

export async function readRecurringCommitmentFile(fileId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
} | null> {
  const file = await prisma.recurringCommitmentFile.findUnique({ where: { id: fileId } });
  if (!file) return null;

  if (file.fileData && file.fileData.length > 0) {
    return {
      buffer: Buffer.from(file.fileData),
      mimeType: file.mimeType,
      originalFileName: file.originalFileName,
    };
  }

  try {
    const abs = path.join(filesRoot(), file.storagePath);
    const buffer = await fs.readFile(abs);
    return {
      buffer,
      mimeType: file.mimeType,
      originalFileName: file.originalFileName,
    };
  } catch {
    return null;
  }
}

export async function deleteRecurringCommitmentFile(fileId: string): Promise<boolean> {
  const file = await prisma.recurringCommitmentFile.findUnique({ where: { id: fileId } });
  if (!file) return false;
  await removeStoredFileFromDisk(file.storagePath);
  await prisma.recurringCommitmentFile.delete({ where: { id: fileId } });
  return true;
}
