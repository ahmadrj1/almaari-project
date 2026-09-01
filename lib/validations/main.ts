import { z } from "zod";

export const addressSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const patchAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const cartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  quantity: z.number().min(1),
});

export const patchCartItemSchema = z.object({
  cartItemId: z.string(),
  quantity: z.number(),
});

export const deleteCartItemSchema = z.object({
  cartItemId: z.string(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});
