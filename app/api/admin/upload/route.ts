import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize title to create slug
    const slug = title
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      : "product";
    
    const timestamp = Date.now().toString().slice(-6); // short timestamp
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${slug}-${timestamp}.${extension}`;

    const publicDir = join(process.cwd(), "public");
    const uploadDir = join(publicDir, "images", "products");
    const filePath = join(uploadDir, filename);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write file
    await writeFile(filePath, buffer);

    const imagePath = `/images/products/${filename}`;

    return NextResponse.json({ success: true, imagePath });
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 });
  }
}
