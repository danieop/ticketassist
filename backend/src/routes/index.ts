import { Router } from "express";
import { agentRouter } from "./agent.routes.js";
import { healthRouter } from "./health.routes.js";
import { repositoryRouter } from "./repository.routes.js";
import { workflowRouter } from "./workflow.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/api/agents", agentRouter);
apiRouter.use("/api/repositories", repositoryRouter);
apiRouter.use("/api/workflows", workflowRouter);
