import { prisma } from "@/lib/db";
import { parseSku, extractTitlePrefix } from "@/lib/sku";
import * as ExcelJS from "exceljs";

// ─── Next SKU ─────────────────────────────────────────────────────────────────

export class AdminProductSkuService {
  static async getNextSku(title: string) {
    const titlePrefix = extractTitlePrefix(title);
    const products = await prisma.product.findMany({
      where: { titlePrefix },
      select: { code: true },
    });

    let maxCode = 0;
    for (const p of products) {
      const num = parseInt(p.code, 10);
      if (!isNaN(num) && num > maxCode) maxCode = num;
    }

    return { titlePrefix, nextCode: String(maxCode + 1).padStart(3, "0") };
  }

  // ─── Validate SKUs ─────────────────────────────────────────────────────────

  static async validateSkus(rawSkus: string[]) {
    const cleanSkus = Array.from(
      new Set(
        rawSkus
          .map((s) => (s ? String(s).trim().toUpperCase() : ""))
          .filter(Boolean),
      ),
    );

    if (cleanSkus.length === 0) {
      return { matched: {}, notFound: [], unmatched: [] };
    }

    const productSelect = {
      id: true,
      title: true,
      titlePrefix: true,
      code: true,
      image: true,
      description: true,
      price: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
      images: {
        select: {
          id: true,
          url: true,
          colorId: true,
          sortOrder: true,
          color: { select: { name: true } },
        },
        orderBy: { sortOrder: "asc" as const },
      },
    };

    type ProductSelect = {
      id: string;
      title: string;
      titlePrefix: string;
      code: string;
      image: string;
      description: string | null;
      price: unknown;
      categoryId: string | null;
      category: { id: string; name: string } | null;
      images: Array<{
        id: string;
        url: string;
        colorId: string | null;
        sortOrder: number;
        color: { name: string } | null;
      }>;
    };

    const buildMatchedData = (prod: ProductSelect, variantSku?: string) => {
      let images = prod.images.map((img) => ({
        id: img.id,
        url: img.url,
        colorId: img.colorId,
        colorName: img.color?.name || null,
        sortOrder: img.sortOrder,
      }));

      if (images.length === 0 && prod.image) {
        images = [
          {
            id: `main-${prod.id}`,
            url: prod.image,
            colorId: null,
            colorName: null,
            sortOrder: 0,
          },
        ];
      }

      return {
        productId: prod.id,
        productTitle: prod.title,
        baseSku: `${prod.titlePrefix}-${prod.code}`,
        variantSku,
        image: prod.image,
        images,
        categoryId: prod.categoryId,
        categoryName: prod.category?.name || null,
      };
    };

    const matchedVariants = await prisma.productVariant.findMany({
      where: { sku: { in: cleanSkus } },
      include: { product: { select: productSelect } },
    });

    const matchedMap: Record<string, ReturnType<typeof buildMatchedData>> = {};
    matchedVariants.forEach((v) => {
      matchedMap[v.sku] = buildMatchedData(v.product, v.sku);
    });

    const remaining = cleanSkus.filter((s) => !matchedMap[s]);
    for (const sku of remaining) {
      const parsed = parseSku(sku);
      if (parsed) {
        const prod = await prisma.product.findFirst({
          where: {
            titlePrefix: parsed.titlePrefix,
            code: parsed.code,
            deletedAt: null,
          },
          select: productSelect,
        });
        if (prod) matchedMap[sku] = buildMatchedData(prod);
      }
    }

    const notFound = cleanSkus.filter((s) => !matchedMap[s]);
    return { matched: matchedMap, notFound, unmatched: notFound };
  }

  // ─── Excel Template ────────────────────────────────────────────────────────

  static async generateTemplate(): Promise<Buffer> {
    const [colors, sizes, categories] = await Promise.all([
      prisma.color.findMany({ orderBy: { name: "asc" } }),
      prisma.size.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);

    const colorNames = colors.map((c) => c.name);
    const sizeNames = sizes.map((s) => s.name);
    const categoryNames = categories.map((c) => c.name);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Cart Attack Admin";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Products", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "sku", key: "sku", width: 22 },
      { header: "title", key: "title", width: 30 },
      { header: "description", key: "description", width: 35 },
      { header: "price", key: "price", width: 12 },
      { header: "categoryName", key: "categoryName", width: 20 },
      { header: "colorName", key: "colorName", width: 18 },
      { header: "sizeName", key: "sizeName", width: 14 },
      { header: "stock", key: "stock", width: 10 },
      { header: "imagePath", key: "imagePath", width: 30 },
    ] as Partial<ExcelJS.Column>[];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      cell.alignment = { vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FF1D4ED8" } } };
    });
    headerRow.height = 22;

    sheet.addRow({
      sku: "",
      title: "Classic Denim Jacket",
      description:
        "Timeless denim jacket crafted from premium cotton with durable stitching and a comfortable regular fit.",
      price: 49.99,
      categoryName: categoryNames[0] ?? "Jackets",
      colorName: colorNames[0] ?? "Blue",
      sizeName: sizeNames[0] ?? "M",
      stock: 15,
      imagePath: "jacket_blue.jpg",
    });

    const sampleRow = sheet.getRow(2);
    sampleRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F9FF" },
      };
    });
    sampleRow.font = { italic: true, color: { argb: "FF64748B" } };

    const MAX_ROWS = 1000;
    const buildInlineList = (items: string[]) =>
      `"${items.map((i) => i.replace(/"/g, "")).join(",")}"`;

    if (categoryNames.length > 0) {
      const catList = buildInlineList(categoryNames);
      for (let r = 2; r <= MAX_ROWS; r++) {
        sheet.getCell(`E${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [catList],
          showErrorMessage: true,
          errorTitle: "Invalid category",
          error: `Choose a category from the list: ${categoryNames.join(", ")}`,
        };
      }
    }

    if (colorNames.length > 0) {
      const colorList = buildInlineList(colorNames);
      for (let r = 2; r <= MAX_ROWS; r++) {
        sheet.getCell(`F${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [colorList],
          showErrorMessage: true,
          errorTitle: "Invalid color",
          error: `Choose a color from the list: ${colorNames.join(", ")}`,
        };
      }
    }

    if (sizeNames.length > 0) {
      const sizeList = buildInlineList(sizeNames);
      for (let r = 2; r <= MAX_ROWS; r++) {
        sheet.getCell(`G${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [sizeList],
          showErrorMessage: true,
          errorTitle: "Invalid size",
          error: `Choose a size from the list: ${sizeNames.join(", ")}`,
        };
      }
    }

    sheet.getCell("A1").note =
      "Leave empty for new products. Enter existing SKU (e.g. SHIR-001-S-BLK or SHIR-001) to update.";
    sheet.getCell("C1").note = "Required description (max 500 characters).";
    sheet.getCell("I1").note =
      "Filename only (e.g. shirt_blue.jpg). On upload, select the folder containing your images to auto-match.";

    if (colors.length > 0) {
      const refSheet = workbook.addWorksheet("Color Reference");
      refSheet.columns = [
        { header: "Color Name", key: "name", width: 22 },
        { header: "Hex Code", key: "hex", width: 14 },
      ] as Partial<ExcelJS.Column>[];

      const refHeader = refSheet.getRow(1);
      refHeader.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
      });

      colors.forEach((c) => {
        const row = refSheet.addRow({ name: c.name, hex: c.hexCode });
        row.getCell(2).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + c.hexCode.replace("#", "") },
        };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }
}
