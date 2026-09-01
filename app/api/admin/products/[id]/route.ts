import { AdminProductController } from "@/controllers/admin-product.controller";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return AdminProductController.getProductById(req, id);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return AdminProductController.updateProduct(req, id);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return AdminProductController.deleteProduct(req, id);
}
