import { AddressController } from "@/controllers/address.controller";

export async function GET(req: Request) {
  return AddressController.getAddresses(req);
}

export async function POST(req: Request) {
  return AddressController.addAddress(req);
}
