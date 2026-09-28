import { NextRequest } from "next/server";
import { SocketNotifyController } from "@/controllers/socket-notify.controller";

export async function POST(req: NextRequest) {
  return SocketNotifyController.notify(req);
}
