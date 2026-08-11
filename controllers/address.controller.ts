import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError, AppError } from "@/lib/api-error";
import { AddressService } from "@/services/address.service";

export class AddressController {
  static async getAddresses(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const data = await AddressService.getAddresses(session.user.id);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AddressController.getAddresses");
    }
  }

  static async addAddress(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const body = await req.json();
      const data = await AddressService.addAddress(session.user.id, body);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AddressController.addAddress");
    }
  }
}
