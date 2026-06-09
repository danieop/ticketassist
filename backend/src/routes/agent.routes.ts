import { Router } from "express";
import { listAgents } from "../controllers/agent.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const agentRouter = Router();

agentRouter.use(requireAuth);

/**
 * @openapi
 * /api/agents:
 *   get:
 *     tags:
 *       - Agents
 *     summary: List configured sequential agents
 *     responses:
 *       200:
 *         description: Agent list ordered by executionOrder
 */
agentRouter.get("/", listAgents);
