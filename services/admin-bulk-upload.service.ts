import { NextRequest } from "next/server";
import { queueBulkProductsUpload } from "@/lib/job-scheduler";
import { cloudinary } from "@/lib/cloudinary.server";
import { prisma } from "@/lib/db";
import { parseCSVToProducts } from "@/lib/csv-parser";
import { createBroadcastNotification } from "@/lib/notifications";
import { PRODUCT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants";

type ProductPayload = {
  title: string;
  description: string;
  price: number;
  image: string;
  categoryName?: string;
  sku?: string;
  isUpdate?: boolean;
  targetProductId?: string;
  variants?: Array<{
    colorName: string;
    hexCode?: string;
    sizeName: string;
    stock: number;
    sku?: string;
  }>;
  images?: Array<{ url: string; colorName?: string; sortOrder?: number }>;
};

async function uploadImageToCloudinary(imgFile: File): Promise<string> {
  const arrayBuffer = await imgFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "cart-attack/bulk" }, (error, res) => {
          if (error || !res) reject(error);
          else resolve(res);
        })
        .end(buffer);
    },
  );
  return result.secure_url;
}

export class AdminBulkUploadService {
  static async parseRequest(req: NextRequest): Promise<ProductPayload[]> {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.products || !Array.isArray(body.products)) {
        throw new Error("Invalid JSON body. 'products' array is required.");
      }
      return body.products as ProductPayload[];
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const imageFiles = formData.getAll("images") as File[];

    if (!file) throw new Error("CSV or JSON file is required");

    const uploadedImageMap: Record<string, string> = {};
    for (const imgFile of imageFiles) {
      if (imgFile.size > 0) {
        uploadedImageMap[imgFile.name] = await uploadImageToCloudinary(imgFile);
      }
    }

    const dbColors = await prisma.color.findMany({
      select: { name: true, hexCode: true },
    });
    const colorHexMap = new Map(
      dbColors.map((c) => [c.name.toLowerCase(), c.hexCode]),
    );

    const fileText = await file.text();
    const fileName = file.name.toLowerCase();

    type RawProduct = {
      title: string;
      description: string;
      price: number | string;
      image?: string;
      imageFileName?: string;
      categoryName?: string;
      colorName?: string;
      hexCode?: string;
      sizeName?: string;
      stock?: number | string;
      sku?: string;
      isUpdate?: boolean;
      targetProductId?: string;
      variants?: Array<{
        colorName: string;
        hexCode?: string;
        sizeName: string;
        stock: number;
        sku?: string;
      }>;
      images?: Array<{ url: string; colorName?: string; sortOrder?: number }>;
    };

    let rawProducts: RawProduct[] = [];

    if (fileName.endsWith(".json")) {
      rawProducts = JSON.parse(fileText) as RawProduct[];
    } else if (fileName.endsWith(".csv")) {
      const parsed = parseCSVToProducts(fileText);
      rawProducts = parsed.map((p) => ({
        title: p.title,
        description: p.description,
        price: parseFloat(p.price || "0"),
        categoryName: p.categoryName || undefined,
        sku: p.sku,
        isUpdate: p.isUpdate,
        targetProductId: p.targetProductId,
        variants: p.variants.map((v) => ({
          colorName: v.colorName,
          hexCode:
            v.hexCode ||
            colorHexMap.get(v.colorName.toLowerCase()) ||
            "#000000",
          sizeName: v.sizeName,
          stock: v.stock,
          sku: v.sku,
        })),
        images:
          p.csvImages?.map((img, idx) => ({
            url: uploadedImageMap[img.imagePath] || img.imagePath,
            colorName: img.colorName,
            sortOrder: idx,
          })) || [],
        imageFileName: p.csvImages?.[0]?.imagePath,
      }));
    } else {
      throw new Error("File format must be CSV or JSON");
    }

    return rawProducts.map((p) => {
      const mainImageUrl =
        p.imageFileName && uploadedImageMap[p.imageFileName]
          ? uploadedImageMap[p.imageFileName]
          : p.image ||
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30";

      const variants = p.variants || [
        {
          colorName: p.colorName || "Default",
          hexCode: p.hexCode || "#000000",
          sizeName: p.sizeName || "Standard",
          stock: Number(p.stock) || 0,
          sku: p.sku,
        },
      ];

      return {
        title: p.title,
        description: p.description || "",
        price: Number(p.price) || 0,
        image: mainImageUrl,
        categoryName: p.categoryName,
        sku: p.sku,
        isUpdate: p.isUpdate,
        targetProductId: p.targetProductId,
        variants,
        images: p.images || [],
      };
    });
  }

  static validateDescriptions(products: ProductPayload[]) {
    const invalid = products.filter(
      (p) =>
        !p.description ||
        p.description.trim().length === 0 ||
        p.description.length > PRODUCT_DESCRIPTION_MAX_LENGTH,
    );
    if (invalid.length > 0) {
      throw new Error(
        `${invalid.length} product(s) are missing a valid description (max ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters).`,
      );
    }
  }

  static async queueAndNotify(products: ProductPayload[]) {
    const toCreate = products.filter((p) => !p.isUpdate);
    const toUpdate = products.filter((p) => Boolean(p.isUpdate));

    const responses: { create?: unknown; update?: unknown } = {};

    if (toCreate.length > 0) {
      responses.create = await queueBulkProductsUpload(toCreate, "POST");
    }
    if (toUpdate.length > 0) {
      responses.update = await queueBulkProductsUpload(toUpdate, "PATCH");
    }
    if (toCreate.length > 0) {
      await createBroadcastNotification(
        "NEW_PRODUCT",
        "New Products Added!",
        "New products have been added to the catalogue!",
      );
    }

    return {
      totalProducts: products.length,
      createdCount: toCreate.length,
      updatedCount: toUpdate.length,
      jobResponse: responses,
    };
  }
}
