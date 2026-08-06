export const RESET_TOKEN_EXPIRY_MS = 900000; // 15 minutes in milliseconds
export const SESSION_EXPIRY_REMEMBER_ME = 7 * 24 * 60 * 60; // 7 days in seconds
export const SESSION_EXPIRY_DEFAULT = 24 * 60 * 60; // 1 day in seconds
export const TAX_PERCENTAGE = 0.10; // 10%
export const PRODUCTS_PER_PAGE_DEFAULT = 8;
export const ORDERS_PER_PAGE_DEFAULT = 10;
export const DEFAULT_SORT = "newest";
export const SEARCH_DEBOUNCE_MS = 400;

export const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name: A–Z", value: "title_asc" },
  { label: "Name: Z–A", value: "title_desc" },
] as const;
