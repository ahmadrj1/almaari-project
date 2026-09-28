import { z } from "zod";
import { PRODUCT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants";

export const productFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(
      PRODUCT_DESCRIPTION_MAX_LENGTH,
      `Description cannot exceed ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters`,
    ),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Price must be greater than 0",
    }),
  categoryId: z.string().min(1, "Category is required"),
});
