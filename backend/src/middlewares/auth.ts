import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./error-handler.js";

export type AuthUser = {
  id: string;
  email: string;
  role: "DEVELOPER" | "MENTOR" | "ADMIN";
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export const requireAuth: RequestHandler = (request, _response, next) => {
  try {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : (typeof request.query.token === "string" ? request.query.token : undefined);

    if (!token) {
      throw new AppError(401, "Missing authorization token");
    }

    const payload = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      payload.tokenType !== "access" ||
      !["DEVELOPER", "MENTOR", "ADMIN"].includes(String(payload.role))
    ) {
      throw new AppError(401, "Invalid authorization token");
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as AuthUser["role"]
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, "Invalid authorization token"));
  }
};

export function requireRole(...roles: AuthUser["role"][]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError(401, "Missing authorization token"));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new AppError(403, "You do not have permission to access this resource"));
      return;
    }

    next();
  };
}
