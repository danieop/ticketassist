import { prisma } from "../config/prisma.js";

export const agentService = {
  list() {
    return prisma.agent.findMany({
      orderBy: { executionOrder: "asc" }
    });
  }
};
