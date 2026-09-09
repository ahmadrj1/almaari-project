/**
 * One-time script to generate public/templates/products_template.xlsx
 *
 * Run: npx ts-node --project tsconfig.scripts.json scripts/generate-product-template.ts
 * After running, uninstall exceljs: npm uninstall exceljs
 */

import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  // ── Main sheet ─────────────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet("Products", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "title", key: "title", width: 30 },
    { header: "price", key: "price", width: 12 },
    { header: "categoryName", key: "categoryName", width: 20 },
    { header: "colorName", key: "colorName", width: 18 },
    { header: "sizeName", key: "sizeName", width: 14 },
    { header: "stock", key: "stock", width: 10 },
    { header: "imagePath", key: "imagePath", width: 30 },
  ];
  sheet.columns = columns;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" }, // blue-600
    };
    cell.alignment = { vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF1D4ED8" } },
    };
  });
  headerRow.height = 22;

  // Sample data row
  sheet.addRow({
    title: "Classic Denim Jacket",
    price: 49.99,
    categoryName: categoryNames[0] ?? "Jackets",
    colorName: colorNames[0] ?? "Blue",
    sizeName: sizeNames[0] ?? "M",
    stock: 15,
    imagePath: "jacket_blue.jpg",
  });

  // Style the sample row
  const sampleRow = sheet.getRow(2);
  sampleRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F9FF" },
    };
  });
  sampleRow.font = { italic: true, color: { argb: "FF64748B" } };

  // ── Data validation dropdowns (rows 2-1000) ────────────────────────────────
  const MAX_ROWS = 1000;

  // ExcelJS inline list has a 255-char limit; use a reference sheet if list is large
  const buildInlineList = (items: string[]) =>
    `"${items.map((i) => i.replace(/"/g, "")).join(",")}"`;

  // Category dropdown — now column C
  if (categoryNames.length > 0) {
    const catList = buildInlineList(categoryNames);
    for (let r = 2; r <= MAX_ROWS; r++) {
      sheet.getCell(`C${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [catList],
        showErrorMessage: true,
        errorTitle: "Invalid category",
        error: `Choose a category from the list: ${categoryNames.join(", ")}`,
      };
    }
  }

  // Color dropdown — now column D
  if (colorNames.length > 0) {
    const colorList = buildInlineList(colorNames);
    for (let r = 2; r <= MAX_ROWS; r++) {
      sheet.getCell(`D${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [colorList],
        showErrorMessage: true,
        errorTitle: "Invalid color",
        error: `Choose a color from the list: ${colorNames.join(", ")}`,
      };
    }
  }

  // Size dropdown — column E
  if (sizeNames.length > 0) {
    const sizeList = buildInlineList(sizeNames);
    for (let r = 2; r <= MAX_ROWS; r++) {
      sheet.getCell(`E${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [sizeList],
        showErrorMessage: true,
        errorTitle: "Invalid size",
        error: `Choose a size from the list: ${sizeNames.join(", ")}`,
      };
    }
  }

  // imagePath column note — column G
  sheet.getCell("G1").note =
    "Filename only (e.g. shirt_blue.jpg). On upload, select the folder containing your images to auto-match.";

  // ── Color reference sheet ─────────────────────────────────────────────────
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
      // Paint the hex cell with the actual color
      row.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + c.hexCode.replace("#", "") },
      };
    });
  }

  // ── Write file ─────────────────────────────────────────────────────────────
  const outDir = path.join(process.cwd(), "public", "templates");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "products_template.xlsx");
  await workbook.xlsx.writeFile(outPath);

  console.log(`✅ Template generated: ${outPath}`);
  console.log(`   Colors: ${colorNames.length}, Sizes: ${sizeNames.length}, Categories: ${categoryNames.length}`);
  console.log("\nNext: npm uninstall exceljs");
}

main()
  .catch((err) => {
    console.error("❌ Error generating template:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
