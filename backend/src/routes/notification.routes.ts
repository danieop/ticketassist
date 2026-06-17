import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import * as ctrl from "../controllers/notification.controller.js";

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

notificationRouter.get("/stream", ctrl.stream);
notificationRouter.get("/", ctrl.list);
notificationRouter.get("/unread-count", ctrl.unreadCount);
notificationRouter.patch("/:id/read", ctrl.markRead);
notificationRouter.patch("/read-all", ctrl.markAllRead);
