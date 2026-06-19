import type { RequestHandler } from "express";
import { notificationService } from "../services/notification.service.js";
import { addClient, removeClient } from "../services/sse-manager.js";

export const stream: RequestHandler = async (request, response) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");

  const userId = request.user!.id;
  addClient(userId, response);

  const unreadCount = await notificationService.getUnreadCount(userId);
  response.write(`event: connected\ndata: ${JSON.stringify({ unreadCount })}\n\n`);

  request.on("close", () => {
    removeClient(userId, response);
  });
};

export const list: RequestHandler = async (request, response, next) => {
  try {
    const unreadOnly = request.query.unreadOnly === "true";
    const limit = typeof request.query.limit === "string" ? Number(request.query.limit) : undefined;
    const cursor = typeof request.query.cursor === "string" ? request.query.cursor : undefined;

    const notifications = await notificationService.listForUser(request.user!.id, {
      unreadOnly,
      limit: Number.isFinite(limit) && limit ? limit : undefined,
      cursor
    });

    response.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const unreadCount: RequestHandler = async (request, response, next) => {
  try {
    const count = await notificationService.getUnreadCount(request.user!.id);
    response.json({ count });
  } catch (error) {
    next(error);
  }
};

export const markRead: RequestHandler = async (request, response, next) => {
  try {
    await notificationService.markAsRead(request.user!.id, request.params.id as string);
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const markAllRead: RequestHandler = async (request, response, next) => {
  try {
    await notificationService.markAllAsRead(request.user!.id);
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
};
