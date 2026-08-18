export const APP_NAME = "Almaari";
export const RESET_TOKEN_EXPIRY_MS = 900000; // 15 minutes in milliseconds
export const SESSION_EXPIRY_REMEMBER_ME = 7 * 24 * 60 * 60; // 7 days in seconds
export const SESSION_EXPIRY_DEFAULT = 24 * 60 * 60; // 1 day in seconds
export const TAX_PERCENTAGE = 0.10; // 10%
export const PRODUCTS_PER_PAGE_DEFAULT = 12;
export const ORDERS_PER_PAGE_DEFAULT = 8;
export const ADMIN_PRODUCTS_PER_PAGE_DEFAULT = 8;
export const ADMIN_ORDERS_PER_PAGE_DEFAULT = 8;
export const DEFAULT_SORT = "title_asc";
export const SEARCH_DEBOUNCE_MS = 400;
export const POLLING_TIME = 10 * 1000; // 10 seconds in milliseconds
export const CART_ITEM_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name: A–Z", value: "title_asc" },
  { label: "Name: Z–A", value: "title_desc" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  PROCESSING: "bg-yellow-100 text-yellow-800",
  PENDING: "bg-blue-100 text-blue-800",
};

export const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const JUST_AUTHENTICATED_KEY = "just_authenticated";