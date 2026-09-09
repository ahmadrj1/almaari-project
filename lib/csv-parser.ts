import { ResolvedImage } from "@/lib/resolved-image-store";

export interface ParsedCSVVariant {
  colorName: string;
  hexCode?: string;
  sizeName: string;
  stock: number;
}

export interface ParsedCSVImage {
  imagePath: string;
  /** Color this image belongs to — used to auto-link image to its variant */
  colorName: string;
}

export interface ParsedCSVProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  categoryName: string;
  variants: ParsedCSVVariant[];
  /** All image entries collected across all rows for this product */
  csvImages?: ParsedCSVImage[];
  /** Resolved File objects matched from a user-selected folder/files */
  resolvedImages?: ResolvedImage[];
}

export function parseCSVToProducts(csvText: string): ParsedCSVProduct[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  // Helper to split CSV row handling quoted fields
  const parseCSVRow = (text: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ""));
    return result;
  };

  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");

  const rawHeaders = parseCSVRow(lines[0]);
  const headers = rawHeaders.map((h) => norm(h));

  const productMap: Map<string, ParsedCSVProduct> = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = (cols[idx] || "").trim();
    });

    const title =
      rowObj["title"] || rowObj["producttitle"] || rowObj["name"] || "";
    if (!title) continue;

    const key = title.trim().toLowerCase();
    const description = rowObj["description"] || rowObj["desc"] || "";
    const price = rowObj["price"] || rowObj["cost"] || "";
    const categoryName = rowObj["categoryname"] || rowObj["category"] || "";
    const colorName =
      rowObj["colorname"] ||
      rowObj["color"] ||
      rowObj["colour"] ||
      rowObj["colourname"] ||
      "Default";
    const hexCode = rowObj["hexcode"] || rowObj["hex"] || "#000000";
    const sizeName = rowObj["sizename"] || rowObj["size"] || "Standard";
    const stock = parseInt(rowObj["stock"] || rowObj["quantity"] || "0", 10);
    const imagePath =
      rowObj["imagepath"] ||
      rowObj["imagefilename"] ||
      rowObj["imagefile"] ||
      rowObj["image"] ||
      "";

    const csvImage: ParsedCSVImage | undefined = imagePath.trim()
      ? { imagePath: imagePath.trim(), colorName: colorName.trim() }
      : undefined;

    if (!productMap.has(key)) {
      productMap.set(key, {
        id: Math.random().toString(36).substring(2, 9),
        title: title.trim(),
        description: description.trim(),
        price: price ? String(price) : "",
        categoryName: categoryName.trim(),
        csvImages: csvImage ? [csvImage] : [],
        variants: [
          {
            colorName: colorName.trim(),
            hexCode: hexCode.trim(),
            sizeName: sizeName.trim(),
            stock: isNaN(stock) ? 0 : stock,
          },
        ],
      });
    } else {
      const existing = productMap.get(key)!;
      if (!existing.description && description) {
        existing.description = description.trim();
      }
      if (!existing.price && price) {
        existing.price = String(price);
      }
      if (!existing.categoryName && categoryName) {
        existing.categoryName = categoryName.trim();
      }
      // Collect image for this row (each row/color can have its own image)
      if (csvImage) {
        const alreadyHas = existing.csvImages?.some(
          (img) =>
            img.imagePath.trim().toLowerCase() ===
              csvImage.imagePath.trim().toLowerCase() &&
            img.colorName.trim().toLowerCase() ===
              csvImage.colorName.trim().toLowerCase(),
        );
        if (!alreadyHas) {
          existing.csvImages = [...(existing.csvImages ?? []), csvImage];
        }
      }
      // Add variant if not duplicate
      const hasVariant = existing.variants.some(
        (v) =>
          v.colorName.toLowerCase() === colorName.trim().toLowerCase() &&
          v.sizeName.toLowerCase() === sizeName.trim().toLowerCase(),
      );
      if (!hasVariant) {
        existing.variants.push({
          colorName: colorName.trim(),
          hexCode: hexCode.trim(),
          sizeName: sizeName.trim(),
          stock: isNaN(stock) ? 0 : stock,
        });
      }
    }
  }

  return Array.from(productMap.values());
}
