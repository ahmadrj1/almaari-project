import { AppError } from "@/lib/api-error";
import { cloudinary } from "@/lib/cloudinary.server";
import { Readable } from "stream";

export class UploadService {
  static async uploadProductImage(file: File | null, title: string | null) {
    if (!file) {
      throw new AppError("No file uploaded", 400);
    }

    const slug = title
      ? title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      : "product";

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new AppError("Cloudinary is not configured", 500);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = "almaari/products";
    const publicId = `${slug}-${Date.now().toString().slice(-6)}`;

    const result = await new Promise<{ secure_url?: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(result || {});
          },
        );

        Readable.from(buffer).pipe(uploadStream);
      },
    );

    if (!result.secure_url) {
      throw new AppError("Failed to upload image to Cloudinary", 500);
    }

    return result.secure_url;
  }
}
