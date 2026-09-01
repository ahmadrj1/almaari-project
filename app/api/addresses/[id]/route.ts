import { AddressController } from "@/controllers/address.controller";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return AddressController.updateAddress(req, { params: { id } });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return AddressController.deleteAddress(req, { params: { id } });
}
