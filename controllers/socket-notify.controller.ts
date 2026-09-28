import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { SocketNotifyService } from "@/services/socket-notify.service";

export class SocketNotifyController {
  static async notify(req: Request) {
    try {
      const authHeader = req.headers.get("authorization");
      const secret = process.env.JOB_SCHEDULER_SECRET;

      if (!secret || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      SocketNotifyService.dispatch(body);

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error, "SocketNotifyController.notify");
    }
  }
}
