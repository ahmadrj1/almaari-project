export const APP_NAME = "Almaari";
export const RESET_TOKEN_EXPIRY_MS = 900000; // 15 minutes in milliseconds
export const SESSION_EXPIRY_REMEMBER_ME = 7 * 24 * 60 * 60; // 7 days in seconds
export const SESSION_EXPIRY_DEFAULT = 24 * 60 * 60; // 1 day in seconds
export const TAX_PERCENTAGE = 0.1; // 10%
export const PRODUCTS_PER_PAGE_DEFAULT = 8;
export const ORDERS_PER_PAGE_DEFAULT = 8;
export const ADMIN_PRODUCTS_PER_PAGE_DEFAULT = 8;
export const ADMIN_ORDERS_PER_PAGE_DEFAULT = 8;
export const DEFAULT_SORT = "title_asc";
export const SEARCH_DEBOUNCE_MS = 300;
export const POLLING_TIME = 10 * 1000; // 10 seconds in milliseconds
export const CART_ITEM_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in milliseconds
export const MAX_PRODUCTS_MEMORY = 16;
export const MAX_NOTIFICATIONS_MEMORY = 12;

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

export const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
export const STATUS_LEVELS: Record<string, number> = {
  PENDING: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: 3,
};
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const JUST_AUTHENTICATED_KEY = "just_authenticated";
export const STRIPE_MIN_AMOUNT_PKR = 150;
export const NEXT_SKU_DEBOUNCE_MS = 400;

export const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;
export const CHATBOT_NAME = "Almaari Assistant";
export const CHATBOT_CONTEXT_PAIRS_LIMIT = 5;

// LLM inference settings
export const CHATBOT_TEMPERATURE = 0.3;
export const CHATBOT_TOP_P = 0.85;
export const CHATBOT_MAX_TOKENS = 750;
export const ADMIN_CHATBOT_MAX_TOKENS = 1024;

// Embedding / semantic search settings
export const EMBEDDING_MODEL_TS = "Xenova/all-mpnet-base-v2";
export const EMBEDDING_SIMILARITY_THRESHOLD = 0.35;
export const EMBEDDING_TOP_CANDIDATES = 7;

export const STORE_KNOWLEDGE = `STORE & PLATFORM POLICIES & KNOWLEDGE:
- Remember Me / Sessions: When the "Remember me" checkbox is enabled, user stays logged in for 7 days. Otherwise, sessions last 24 hours.
- Return, Exchange & Refund Policy: The store has NO return, exchange, or refund policy regarding placed orders.
- Payment Retries: Users can retry failed payments within 5 days after placing an order. After 5 days, the order is automatically cancelled.
- Order Again: Only cancelled orders show the "Order Again" button. Clicking it adds the same items with the same quantity to the cart (if stock is available).
- User Data Privacy & Security: User data is kept private and secure. Passwords are securely hashed before being saved in the database.
- Payment Processing: All payments and card details are handled strictly by Stripe in a secure way.
- AI Disclaimer: AI can make mistakes. Make sure to double check everything.
- Password Resets: Password reset email links expire in 15 minutes.
- Legal & Policies: There is no official privacy policy or terms and conditions page on the website.
- Contact Details: There is no contact email or phone number for the website.`;

export const SEARCH_STOP_WORDS = [
  "the",
  "and",
  "for",
  "with",
  "need",
  "want",
  "like",
  "show",
  "have",
  "some",
  "what",
  "where",
  "when",
  "does",
  "this",
  "that",
  "your",
  "are",
  "can",
  "you",
  "please",
  "give",
  "item",
  "product",
  "products",
  "look",
  "looking",
] as const;
