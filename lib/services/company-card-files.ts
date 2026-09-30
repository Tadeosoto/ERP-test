import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { useDatabaseFileStorage } from "@/lib/services/file-storage-mode";

const MAX_BYTES = 15 * 1024 * 1024;

function filesRoot(): string {
  const env = process.env.FILES_ROOT;
  if (env) return env;
  return path.join(process.cwd(), "storage", "files");
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isXml(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml";
}

function isTicketFile(file: File): boolean {
  if (isPdf(file)) return true;
  const name = file.name.toLowerCase();
  if (/\.(jpe?g|png)$/.test(name)) return true;
  return file.type === "image/jpeg" || file.type === "image/png";
}

function safeName(name: string): string {
  return name.replace(/[\r\n"]/g, "").slice(0, 180) || "comprobante";
}

async function storeFile(input: {
  movementId: string;
  kind: "factura_pdf" | "factura_xml" | "ticket";
  file: File;
  uploadedByUserId: string;
}): Promise<void> {
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) {
    throw new Error("Cada comprobante debe pesar entre 1 byte y 15 MB.");
  }
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const mimeType =
    input.file.type ||
    (input.kind === "factura_xml" ? "application/xml" : input.kind === "ticket" ? "application/octet-stream" : "application/pdf");

  if (useDatabaseFileStorage()) {
    await prisma.companyCardMovementFile.create({
      data: {
        movementId: input.movementId,
        kind: input.kind,
        originalFileName: safeName(input.file.name),
        storagePath: "database",
        fileData: buffer,
        mimeType,
        sizeBytes: input.file.size,
        uploadedByUserId: input.uploadedByUserId,
      },
    });
    return;
  }

  const root = filesRoot();
  const dir = path.join(root, "tarjetas", input.movementId);
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(input.file.name) || (input.kind === "factura_xml" ? ".xml" : ".pdf");
  const storedName = `${input.kind}_${Date.now()}${ext}`;
  await fs.writeFile(path.join(dir, storedName), buffer);
  const relativePath = path.join("tarjetas", input.movementId, storedName).replace(/\\/g, "/");
  await prisma.companyCardMovementFile.create({
    data: {
      movementId: input.movementId,
      kind: input.kind,
      originalFileName: safeName(input.file.name),
      storagePath: relativePath,
      mimeType,
      sizeBytes: input.file.size,
      uploadedByUserId: input.uploadedByUserId,
    },
  });
}

export async function saveCompanyCardFiles(input: {
  movementId: string;
  receiptKind: "factura" | "ticket";
  files: File[];
  uploadedByUserId: string;
}): Promise<void> {
  if (input.receiptKind === "factura") {
    const pdf = input.files.find(isPdf);
    const xml = input.files.find(isXml);
    if (!pdf || !xml) throw new Error("La factura necesita su PDF y su XML.");
    await storeFile({ movementId: input.movementId, kind: "factura_pdf", file: pdf, uploadedByUserId: input.uploadedByUserId });
    await storeFile({ movementId: input.movementId, kind: "factura_xml", file: xml, uploadedByUserId: input.uploadedByUserId });
    return;
  }
  const ticket = input.files.find(isTicketFile);
  if (!ticket) throw new Error("El ticket acepta JPG, PNG o PDF.");
  await storeFile({ movementId: input.movementId, kind: "ticket", file: ticket, uploadedByUserId: input.uploadedByUserId });
}

export async function removeCompanyCardDiskFiles(movementId: string): Promise<void> {
  const files = await prisma.companyCardMovementFile.findMany({
    where: { movementId },
    select: { storagePath: true },
  });
  await Promise.all(
    files.map(async (file) => {
      if (!file.storagePath || file.storagePath === "database") return;
      try {
        await fs.unlink(path.join(filesRoot(), file.storagePath));
      } catch {
        // El archivo ya no está en disco.
      }
    })
  );
}

export async function clearCompanyCardFiles(movementId: string): Promise<void> {
  await removeCompanyCardDiskFiles(movementId);
  await prisma.companyCardMovementFile.deleteMany({ where: { movementId } });
}

export async function readCompanyCardFile(fileId: string) {
  const file = await prisma.companyCardMovementFile.findUnique({ where: { id: fileId } });
  if (!file) return null;
  if (file.fileData && file.fileData.length > 0) {
    return {
      buffer: Buffer.from(file.fileData),
      mimeType: file.mimeType,
      originalFileName: safeName(file.originalFileName),
    };
  }
  try {
    const buffer = await fs.readFile(path.join(filesRoot(), file.storagePath));
    return { buffer, mimeType: file.mimeType, originalFileName: safeName(file.originalFileName) };
  } catch {
    return null;
  }
}
