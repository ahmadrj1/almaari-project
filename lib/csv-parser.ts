export interface ParsedCSVVariant {
  colorName: string;
  hexCode?: string;
  sizeName: string;
  stock: number;
}

export interface ParsedCSVProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  categoryName: string;
  variants: ParsedCSVVariant[];
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

  const rawHeaders = parseCSVRow(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase());

  const productMap: Map<string, ParsedCSVProduct> = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] || "";
    });

    const title =
      rowObj["title"] || rowObj["product title"] || rowObj["name"] || "";
    if (!title) continue;

    const key = title.trim().toLowerCase();
    const description = rowObj["description"] || rowObj["desc"] || "";
    const price = rowObj["price"] || rowObj["cost"] || "";
    const categoryName = rowObj["categoryname"] || rowObj["category"] || "";
    const colorName = rowObj["colorname"] || rowObj["color"] || "Default";
    const hexCode = rowObj["hexcode"] || rowObj["hex"] || "#000000";
    const sizeName = rowObj["sizename"] || rowObj["size"] || "Standard";
    const stock = parseInt(rowObj["stock"] || rowObj["quantity"] || "0", 10);

    if (!productMap.has(key)) {
      productMap.set(key, {
        id: Math.random().toString(36).substring(2, 9),
        title: title.trim(),
        description: description.trim(),
        price: price ? String(price) : "",
        categoryName: categoryName.trim(),
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
