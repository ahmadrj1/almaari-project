import { Prisma } from "@prisma/client";
import type { ProductCardProps } from "@/components/ui/product-card";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Record<string, string[]>;
}

export type CartItemWithProduct = {
  id: string;
  quantity: number;
  userId: string;
  productId: string;
  variantId: string;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    title: string;
    price: number | string | null;
    image: string;
  };
  variant: {
    id: string;
    stock: number;
    color: { id: string; name: string; hexCode: string };
    size: { id: string; name: string };
  };
};

export type OrderDetail = {
  id: string;
  status: string;
  createdAt: string;
  subTotal: string | number;
  tax: string | number;
  total: string | number;
  items: OrderItem[];
  address?: {
    street: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
  user: {
    id: string;
    fullName: string;
  } | null;
};

export type NotificationType = "ORDER_PLACED" | "ORDER_STATUS_UPDATED" | "NEW_PRODUCT" | string;

export type NotificationMetadata = Prisma.InputJsonObject;

export type SavedAddress = {
  id: string;
  street: string;
  city?: string;
  country?: string;
  zipCode?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  total: number | string;
  status: string;
  user: {
    id: string;
    fullName: string;
  } | null;
  items: { quantity: number }[];
};

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  variants: import("@/components/ui/product-card").Variant[];
  images?: { id: string; url: string; colorId: string | null }[];
};

export type FullProduct = ProductCardProps["product"] & {
  variants: NonNullable<ProductCardProps["product"]["variants"]>;
  images?: { id: string; url: string; colorId: string | null }[];
};

export interface Option {
  label: string;
  value: string;
}

export interface SortDropdownProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly Option[];
}

export interface CartCountContextValue {
  count: number;
  increment: () => void;
  decrement: () => void;
  setCount: (n: number) => void;
  refresh: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ToastData {
  id: string
  type: "success" | "error" | "info"
  message: string
}

export interface Color {
  id: string;
  name: string;
  hexCode: string;
}
export interface Size {
  id: string;
  name: string;
}
export interface Variant {
  id: string;
  colorId: string;
  sizeId: string;
  stock: string | number;
  colorName?: string;
  sizeName?: string;
}
export interface Category {
  id: string;
  name: string;
}
export interface ProductImageUpload {
  id: string;
  file?: File;
  previewUrl: string;
  colorId: string;
  isExisting?: boolean;
}

export interface ProductSummary {
  id: string;
  title: string;
  price: number | string;
  image: string;
  totalStock: number;
  categoryId: string | null;
  variants: {
    id: string;
    stock: number;
    color: {
      id: string;
      name: string;
      hexCode: string;
    };
  }[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number | string;
  colorName: string;
  sizeName: string;
  product: {
    title: string;
    image: string;
    price: number | string;
    variants: {
      color?: { name: string };
      size?: { name: string };
      stock: number;
    }[];
  } | null;
}
