import { CategoryController } from "@/controllers/category.controller";

export async function GET() {
  return CategoryController.getCategories();
}

export async function POST(req: Request) {
  return CategoryController.addCategory(req);
}
