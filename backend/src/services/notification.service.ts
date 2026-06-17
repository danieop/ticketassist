import { Prisma } from "@prisma/client";
import type { NotificationType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { sendToUser, sendToUsers } from "./sse-manager.js";

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const notificationService = {
  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: toJsonValue(data.metadata)
      }
    });

    sendToUser(data.userId, { type: "notification", data: notification });

    return notification;
  },

  async createForRole(
    role: "DEVELOPER" | "MENTOR" | "ADMIN",
    data: {
      type: NotificationType;
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true }
    });

    const notifications = [];
    const userIds: string[] = [];

    for (const user of users) {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: toJsonValue(data.metadata)
        }
      });

      notifications.push(notification);
      userIds.push(user.id);
      sendToUser(user.id, { type: "notification", data: notification });
    }

    return notifications;
  },

  async listForUser(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; cursor?: string }
  ) {
    const limit = options?.limit ?? 20;
    let cursorDate: Date | undefined;

    if (options?.cursor) {
      const cursorNotification = await prisma.notification.findUnique({
        where: { id: options.cursor },
        select: { createdAt: true }
      });

      if (cursorNotification) {
        cursorDate = cursorNotification.createdAt;
      }
    }

    return prisma.notification.findMany({
      where: {
        userId,
        ...(options?.unreadOnly ? { read: false } : {}),
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  },

  async markAsRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true }
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, read: false }
    });
  }
};
