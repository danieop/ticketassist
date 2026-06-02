import { Router } from "express";

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check backend health
 *     responses:
 *       200:
 *         description: Service is healthy
 */
healthRouter.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "ticketassist-backend"
  });
});
