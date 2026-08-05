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
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    title: string;
    price: number | string | null;
    image: string;
    color: string | null;
    size: string | null;
  };
};
