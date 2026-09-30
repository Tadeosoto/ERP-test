import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { useDatabaseFileStorage } from "@/lib/services/file-storage-mode";
import { addMonths, FUEL_RECEIPT_RETENTION_MONTHS } from "@/lib/flota/dates";

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
  if (/\.(jpe?g|png|webp)$/.test(name)) return true;
  return file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
}

function safeName(name: string): string {
  return name.replace(/[\r\n"]/g, "").slice(0, 180) || "comprobante";
}

/** Borra solo el archivo. El gasto de la carga se conserva. Misma idea se puede reutilizar en otros adjuntos. */
export async function purgeExpiredFuelReceipts(now = new Date()): Promise<number> {
  const expired = await prisma.fuelLoadFile.findMany({
    where: { purgedAt: null, expiresAt: { lt: now } },
    select: { id: true, storagePath: true },
  });
  await Promise.all(
    expired.map(async (file) => {
      if (file.storagePath && file.storagePath !== "database") {
        try {
          await fs.unlink(path.join(filesRoot(), file.storagePath));
        } catch {
          // El archivo ya no está en disco.
        }
      }
      await prisma.fuelLoadFile.update({
        where: { id: file.id },
        data: { fileData: null, storagePath: "", sizeBytes: 0, purgedAt: now },
      });
    })
  );
  return expired.length;
}

async function storeFile(input: {
  fuelLoadId: string;
  kind: "factura_pdf" | "factura_xml" | "ticket";
  file: File;
  uploadedByUserId: string;
  expiresAt: Date;
}): Promise<void> {
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) {
    throw new Error("Cada comprobante debe pesar entre 1 byte y 15 MB.");
  }
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const mimeType =
    input.file.type ||
    (input.kind === "factura_xml" ? "application/xml" : input.kind === "ticket" ? "image/jpeg" : "application/pdf");

  if (useDatabaseFileStorage()) {
    await prisma.fuelLoadFile.create({
      data: {
        fuelLoadId: input.fuelLoadId,
        kind: input.kind,
        originalFileName: safeName(input.file.name),
        storagePath: "database",
        fileData: buffer,
        mimeType,
        sizeBytes: input.file.size,
        expiresAt: input.expiresAt,
        uploadedByUserId: input.uploadedByUserId,
      },
    });
    return;
  }

  const root = filesRoot();
  const dir = path.join(root, "combustible", input.fuelLoadId);
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(input.file.name) || (input.kind === "factura_xml" ? ".xml" : ".pdf");
  const storedName = `${input.kind}_${Date.now()}${ext}`;
  await fs.writeFile(path.join(dir, storedName), buffer);
  await prisma.fuelLoadFile.create({
    data: {
      fuelLoadId: input.fuelLoadId,
      kind: input.kind,
      originalFileName: safeName(input.file.name),
      storagePath: path.join("combustible", input.fuelLoadId, storedName).replace(/\\/g, "/"),
      mimeType,
      sizeBytes: input.file.size,
      expiresAt: input.expiresAt,
      uploadedByUserId: input.uploadedByUserId,
    },
  });
}

export function fuelReceiptExpiresAt(occurredOn: Date): Date {
  return addMonths(occurredOn, FUEL_RECEIPT_RETENTION_MONTHS);
}

export async function saveFuelLoadFiles(input: {
  fuelLoadId: string;
  occurredOn: Date;
  receiptKind: "factura" | "ticket";
  files: File[];
  uploadedByUserId: string;
}): Promise<void> {
  const expiresAt = fuelReceiptExpiresAt(input.occurredOn);
  if (input.receiptKind === "factura") {
    const pdf = input.files.find(isPdf);
    const xml = input.files.find(isXml);
    if (!pdf || !xml) throw new Error("La factura necesita su PDF y su XML.");
    await storeFile({ fuelLoadId: input.fuelLoadId, kind: "factura_pdf", file: pdf, uploadedByUserId: input.uploadedByUserId, expiresAt });
    await storeFile({ fuelLoadId: input.fuelLoadId, kind: "factura_xml", file: xml, uploadedByUserId: input.uploadedByUserId, expiresAt });
    return;
  }
  const ticket = input.files.find(isTicketFile);
  if (!ticket) throw new Error("El ticket acepta una foto (JPG, PNG, WEBP) o un PDF.");
  await storeFile({ fuelLoadId: input.fuelLoadId, kind: "ticket", file: ticket, uploadedByUserId: input.uploadedByUserId, expiresAt });
}

export async function readFuelLoadFile(fileId: string) {
  await purgeExpiredFuelReceipts();
  const file = await prisma.fuelLoadFile.findUnique({ where: { id: fileId } });
  if (!file || file.purgedAt) return null;
  if (file.fileData && file.fileData.length > 0) {
    return { buffer: Buffer.from(file.fileData), mimeType: file.mimeType, originalFileName: safeName(file.originalFileName) };
  }
  if (!file.storagePath) return null;
  try {
    const buffer = await fs.readFile(path.join(filesRoot(), file.storagePath));
    return { buffer, mimeType: file.mimeType, originalFileName: safeName(file.originalFileName) };
  } catch {
    return null;
  }
}
