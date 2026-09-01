import { prisma } from "./db";
import { logger } from "./logger";
import { NotificationMetadata } from "../types";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: NotificationMetadata,
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to create notification");
  }
}

export async function createBroadcastNotification(
  type: string,
  title: string,
  message: string,
  metadata?: NotificationMetadata,
) {
  try {
    await prisma.notification.create({
      data: {
        userId: null,
        type,
        title,
        message,
        metadata,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to create broadcast notification");
  }
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
