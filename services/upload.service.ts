import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { AppError } from "@/lib/api-error";

export class UploadService {
  static async uploadProductImage(file: File | null, title: string | null) {
    if (!file) {
      throw new AppError("No file uploaded", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const slug = title
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      : "product";
    
    const timestamp = Date.now().toString().slice(-6);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${slug}-${timestamp}.${extension}`;

    const publicDir = join(process.cwd(), "public");
    const uploadDir = join(publicDir, "images", "products");
    const filePath = join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    return `/images/products/${filename}`;
  }
}
