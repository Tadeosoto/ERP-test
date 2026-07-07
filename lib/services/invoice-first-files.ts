import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { useDatabaseFileStorage } from "@/lib/services/file-storage-mode";

const MAX_BYTES = 20 * 1024 * 1024;

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

export function isInvoiceFirstFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return true;
  if (name.endsWith(".xml")) return true;
  return file.type === "application/pdf" || file.type === "text/xml" || file.type === "application/xml";
}

function fileKind(file: File): "factura_pdf" | "factura_xml" {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xml") || file.type.includes("xml")) return "factura_xml";
  return "factura_pdf";
}

export async function saveInvoiceFirstFile(input: {
  commitmentId: string;
  file: File;
  uploadedByUserId: string;
}): Promise<{ id: string; kind: string }> {
  if (!isInvoiceFirstFile(input.file)) {
    throw new Error("Solo se permiten archivos PDF o XML.");
  }
  if (input.file.size > MAX_BYTES) {
    throw new Error("El archivo supera el límite de 20 MB.");
  }

  const kind = fileKind(input.file);
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const folder = `invoice-first-${input.commitmentId}`;

  if (useDatabaseFileStorage()) {
    const record = await prisma.invoiceFirstFile.create({
      data: {
        commitmentId: input.commitmentId,
        kind,
        originalFileName: input.file.name,
        storagePath: "database",
        fileData: buffer,
        mimeType: input.file.type || (kind === "factura_xml" ? "application/xml" : "application/pdf"),
        sizeBytes: input.file.size,
        uploadedByUserId: input.uploadedByUserId,
      },
    });
    return { id: record.id, kind: record.kind };
  }

  const root = await ensureRoot();
  const dir = path.join(root, "invoice-first", folder);
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(input.file.name) || (kind === "factura_xml" ? ".xml" : ".pdf");
  const storedName = `${kind}_${Date.now()}${ext}`;
  const abs = path.join(dir, storedName);
  await fs.writeFile(abs, buffer);
  const relativePath = path.join("invoice-first", folder, storedName).replace(/\\/g, "/");

  const record = await prisma.invoiceFirstFile.create({
    data: {
      commitmentId: input.commitmentId,
      kind,
      originalFileName: input.file.name,
      storagePath: relativePath,
      mimeType: input.file.type || (kind === "factura_xml" ? "application/xml" : "application/pdf"),
      sizeBytes: input.file.size,
      uploadedByUserId: input.uploadedByUserId,
    },
  });
  return { id: record.id, kind: record.kind };
}

export async function readInvoiceFirstFileBuffer(fileId: string) {
  const file = await prisma.invoiceFirstFile.findUnique({ where: { id: fileId } });
  if (!file) return null;
  if (file.fileData && file.fileData.length > 0) {
    return {
      buffer: Buffer.from(file.fileData),
      mimeType: file.mimeType,
      originalFileName: file.originalFileName,
    };
  }
  const abs = path.join(filesRoot(), file.storagePath);
  try {
    const buffer = await fs.readFile(abs);
    return { buffer, mimeType: file.mimeType, originalFileName: file.originalFileName };
  } catch {
    return null;
  }
}
