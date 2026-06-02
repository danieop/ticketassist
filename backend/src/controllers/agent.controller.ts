import type { RequestHandler } from "express";
import { agentService } from "../services/agent.service.js";

export const listAgents: RequestHandler = async (_request, response, next) => {
  try {
    const agents = await agentService.list();
    response.json({ data: agents });
  } catch (error) {
    next(error);
  }
};
