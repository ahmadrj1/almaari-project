import { NextRequest, NextResponse } from "next/server";
import { queueBulkProductsUpload } from "@/lib/job-scheduler";
import { cloudinary } from "@/lib/cloudinary.server";
import { prisma } from "@/lib/db";
import { parseCSVToProducts } from "@/lib/csv-parser";
import { createBroadcastNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let formattedProducts: Array<{
      title: string;
      description: string;
      price: number;
      image: string;
      categoryName?: string;
      variants?: Array<{
        colorName: string;
        hexCode?: string;
        sizeName: string;
        stock: number;
      }>;
      images?: Array<{ url: string; colorName?: string; sortOrder?: number }>;
    }> = [];

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.products || !Array.isArray(body.products)) {
        return NextResponse.json(
          { error: "Invalid JSON body. 'products' array is required." },
          { status: 400 },
        );
      }
      formattedProducts = body.products;
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const imageFiles = formData.getAll("images") as File[];

      if (!file) {
        return NextResponse.json(
          { error: "CSV or JSON file is required" },
          { status: 400 },
        );
      }

      const fileText = await file.text();
      const fileName = file.name.toLowerCase();

      const uploadedImageMap: Record<string, string> = {};
      for (const imgFile of imageFiles) {
        if (imgFile.size > 0) {
          const arrayBuffer = await imgFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const uploadRes = await new Promise<{ secure_url: string }>(
            (resolve, reject) => {
              cloudinary.uploader
                .upload_stream(
                  { folder: "cart-attack/bulk" },
                  (error, result) => {
                    if (error || !result) reject(error);
                    else resolve(result);
                  },
                )
                .end(buffer);
            },
          );
          uploadedImageMap[imgFile.name] = uploadRes.secure_url;
        }
      }

      // Build colorName → hexCode map from DB for CSV rows that omit hexCode
      const dbColors = await prisma.color.findMany({
        select: { name: true, hexCode: true },
      });
      const colorHexMap = new Map(
        dbColors.map((c) => [c.name.toLowerCase(), c.hexCode]),
      );

      let rawProducts: Array<{
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
        variants?: Array<{
          colorName: string;
          hexCode?: string;
          sizeName: string;
          stock: number;
        }>;
        images?: Array<{ url: string; colorName?: string; sortOrder?: number }>;
      }> = [];

      if (fileName.endsWith(".json")) {
        rawProducts = JSON.parse(fileText);
      } else if (fileName.endsWith(".csv")) {
        const parsed = parseCSVToProducts(fileText);
        rawProducts = parsed.map((p) => ({
          title: p.title,
          description: p.description,
          price: parseFloat(p.price || "0"),
          categoryName: p.categoryName || undefined,
          variants: p.variants.map((v) => ({
            colorName: v.colorName,
            hexCode:
              v.hexCode ||
              colorHexMap.get(v.colorName.toLowerCase()) ||
              "#000000",
            sizeName: v.sizeName,
            stock: v.stock,
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
        return NextResponse.json(
          { error: "File format must be CSV or JSON" },
          { status: 400 },
        );
      }

      formattedProducts = rawProducts.map((p) => {
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
          },
        ];

        return {
          title: p.title,
          description: p.description || "",
          price: Number(p.price) || 0,
          image: mainImageUrl,
          categoryName: p.categoryName,
          variants,
          images: p.images || [],
        };
      });
    }

    const jobRes = await queueBulkProductsUpload(formattedProducts);

    if (formattedProducts.length > 0) {
      await createBroadcastNotification(
        "NEW_PRODUCT",
        "New Products Added!",
        "New products have been added to the catalogue!",
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bulk upload task successfully queued in Background Job Server",
      totalProducts: formattedProducts.length,
      jobResponse: jobRes,
    });
  } catch (error) {
    console.error("[BULK UPLOAD API ERROR]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process bulk upload",
      },
      { status: 500 },
    );
  }
}
