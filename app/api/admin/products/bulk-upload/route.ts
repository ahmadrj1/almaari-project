import { NextRequest, NextResponse } from "next/server";
import { queueBulkProductsUpload } from "@/lib/job-scheduler";
import { cloudinary } from "@/lib/cloudinary.server";

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
        const lines = fileText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/^"|"$/g, ""));
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i]
              .split(",")
              .map((c) => c.trim().replace(/^"|"$/g, ""));
            const rowObj: Record<string, string> = {};
            headers.forEach((h, idx) => {
              rowObj[h] = cols[idx] || "";
            });
            rawProducts.push({
              title: rowObj.title || `Product ${i}`,
              description: rowObj.description || "",
              price: parseFloat(rowObj.price || "0"),
              image: rowObj.image || "",
              imageFileName: rowObj.imageFileName || "",
              categoryName: rowObj.categoryName || undefined,
              colorName: rowObj.colorName || "Default",
              hexCode: rowObj.hexCode || "#000000",
              sizeName: rowObj.sizeName || "Standard",
              stock: parseInt(rowObj.stock || "0", 10),
            });
          }
        }
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

    return NextResponse.json({
      success: true,
      message: "Bulk upload task successfully queued in FastAPI scheduler",
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
