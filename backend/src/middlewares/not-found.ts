import type { RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    message: "Not found",
    path: request.originalUrl
  });
};
