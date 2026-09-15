export const DEFAULT_COLOR_CODES: Record<string, string> = {
  black: "BLK",
  white: "WHT",
  navy: "NVY",
  olive: "OLV",
  beige: "BGE",
  green: "GRN",
  blue: "BLU",
  yellow: "YLW",
  pink: "PNK",
  cyan: "CYN",
  orange: "ORG",
  brown: "BRN",
  "gray/silver": "GRY",
  gray: "GRY",
  silver: "SLV",
  red: "RED",
  purple: "PRP",
  maroon: "MRN",
  charcoal: "CHR",
  gold: "GLD",
};

/**
 * Extracts the first 4 characters of the first word in the title.
 * Strips non-alphanumeric characters and converts to uppercase.
 */
export function extractTitlePrefix(title: string): string {
  if (!title) return "PROD";
  const firstWord = title.trim().split(/\s+/)[0] || "";
  const cleaned = firstWord.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) return "PROD";
  return cleaned.slice(0, 4);
}

/**
 * Resolves a 3-letter uppercase color abbreviation code.
 */
export function resolveColorCode(
  colorName: string,
  knownColors?: Array<{ name: string; code?: string | null }>,
): string {
  if (!colorName) return "DEF";
  const trimmed = colorName.trim();
  const lower = trimmed.toLowerCase();

  // 1. Check knownColors from database
  if (knownColors && knownColors.length > 0) {
    const matched = knownColors.find(
      (c) => c.name.toLowerCase() === lower || c.code?.toLowerCase() === lower,
    );
    if (matched?.code) return matched.code.toUpperCase();
  }

  // 2. Check default dictionary
  if (DEFAULT_COLOR_CODES[lower]) {
    return DEFAULT_COLOR_CODES[lower];
  }

  // 3. Fallback: clean and take first 3 characters
  const cleaned = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length >= 3) {
    return cleaned.slice(0, 3);
  }
  return cleaned.padEnd(3, "X");
}

/**
 * Resolves size code directly matching DB sizes (XS, S, M, L, XL, XXL, Fixed).
 */
export function resolveSizeCode(
  sizeName: string,
  knownSizes?: Array<{ name: string }>,
): string {
  if (!sizeName) return "STD";
  const trimmed = sizeName.trim();

  if (knownSizes && knownSizes.length > 0) {
    const matched = knownSizes.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (matched) return matched.name.toUpperCase();
  }

  const cleaned = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleaned || "STD";
}

/**
 * Assembles full variant SKU in format: TITLE-CODE-SIZE-COLOR
 * e.g., SHIR-001-S-BLK
 */
export function generateVariantSku(
  titlePrefix: string,
  productCode: string | number,
  sizeCode: string,
  colorCode: string,
): string {
  const prefix = (titlePrefix || "PROD").toUpperCase();
  const code = String(productCode).padStart(3, "0");
  const size = (sizeCode || "STD").toUpperCase();
  const color = (colorCode || "DEF").toUpperCase();
  return `${prefix}-${code}-${size}-${color}`;
}

/**
 * Generates base product SKU prefix: TITLE-CODE (e.g. SHIR-001)
 */
export function generateBaseSku(
  titlePrefix: string,
  productCode: string | number,
): string {
  const prefix = (titlePrefix || "PROD").toUpperCase();
  const code = String(productCode).padStart(3, "0");
  return `${prefix}-${code}`;
}

/**
 * Parses an entered SKU into its components.
 */
export function parseSku(sku: string): {
  titlePrefix: string;
  code: string;
  sizeCode?: string;
  colorCode?: string;
} | null {
  if (!sku) return null;
  const parts = sku.trim().toUpperCase().split("-");
  if (parts.length >= 4) {
    return {
      titlePrefix: parts[0],
      code: parts[1],
      sizeCode: parts[2],
      colorCode: parts[3],
    };
  }
  if (parts.length === 2) {
    return {
      titlePrefix: parts[0],
      code: parts[1],
    };
  }
  return null;
}
