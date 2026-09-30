/** Convierte la foto a webp. Si sharp no carga en el servidor, se guarda el archivo original. */
export async function prepareVehicleImage(file: File): Promise<{ data: Buffer; mime: string }> {
  const original = Buffer.from(await file.arrayBuffer());
  const mime = file.type.startsWith("image/") ? file.type : "image/jpeg";
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(original)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { data, mime: "image/webp" };
  } catch (error) {
    console.error("[vehicle-image]", error);
    return { data: original, mime };
  }
}

export async function resizeVehicleImage(data: Buffer, width: number, quality: number, mime: string): Promise<{ data: Buffer; mime: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const output = await sharp(data).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
    return { data: output, mime: "image/webp" };
  } catch (error) {
    console.error("[vehicle-image]", error);
    return { data, mime: mime || "image/jpeg" };
  }
}
