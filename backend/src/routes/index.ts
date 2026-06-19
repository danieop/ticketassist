import { Router } from "express";
import { agentRouter } from "./agent.routes.js";
import { authRouter } from "./auth.routes.js";
import { healthRouter } from "./health.routes.js";
import { repositoryRouter } from "./repository.routes.js";
import { ticketRouter } from "./ticket.routes.js";
import { userRouter } from "./user.routes.js";
import { workflowRouter } from "./workflow.routes.js";
import { notificationRouter } from "./notification.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/api/agents", agentRouter);
apiRouter.use("/api/auth", authRouter);
apiRouter.use("/api/repositories", repositoryRouter);
apiRouter.use("/api/tickets", ticketRouter);
apiRouter.use("/api/users", userRouter);
apiRouter.use("/api/workflows", workflowRouter);
apiRouter.use("/api/notifications", notificationRouter);
